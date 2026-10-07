const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const PaytmChecksum = require("paytmchecksum");

const app = express();

const PORT = process.env.PORT || 10000;


// ==================================================
// PAYTM CONFIG
// ==================================================

const PAYTM_ENVIRONMENT =
    process.env.PAYTM_ENVIRONMENT || "staging";

const PAYTM_MID =
    process.env.PAYTM_MID || "";

const PAYTM_MERCHANT_KEY =
    process.env.PAYTM_MERCHANT_KEY || "";

const PAYTM_WEBSITE_NAME =
    process.env.PAYTM_WEBSITE_NAME ||
    (
        PAYTM_ENVIRONMENT === "production"
            ? "DEFAULT"
            : "WEBSTAGING"
    );

const PAYTM_PG_DOMAIN =
    process.env.PAYTM_PG_DOMAIN ||
    (
        PAYTM_ENVIRONMENT === "production"
            ? "https://secure.paytmpayments.com"
            : "https://securestage.paytmpayments.com"
    );

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eduhub-college-marketplace.onrender.com";

const BACKEND_PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    "https://eduhub-backend-llwi.onrender.com";

const PAYTM_CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    `${BACKEND_PUBLIC_URL}/paytm/callback`;


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: false
    })
);


// ==================================================
// JSON FILE STORAGE
// ==================================================

const productsFile =
    path.join(
        __dirname,
        "products.json"
    );

const usersFile =
    path.join(
        __dirname,
        "users.json"
    );

const messagesFile =
    path.join(
        __dirname,
        "messages.json"
    );

const transactionsFile =
    path.join(
        __dirname,
        "transactions.json"
    );

const paytmOrdersFile =
    path.join(
        __dirname,
        "paytm_orders.json"
    );


// ==================================================
// FILE FUNCTIONS
// ==================================================

function readData(file) {

    try {

        if (!fs.existsSync(file)) {

            fs.writeFileSync(
                file,
                "[]"
            );

            return [];
        }

        const text =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!text.trim()) {
            return [];
        }

        const data =
            JSON.parse(text);

        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        console.log(
            "Read error:",
            file,
            error.message
        );

        return [];
    }
}


function writeData(
    file,
    data
) {

    try {

        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            )
        );

        return true;

    } catch (error) {

        console.log(
            "Write error:",
            file,
            error.message
        );

        return false;
    }
}


function getNextId(items) {

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return 1;
    }

    return (
        Math.max(
            ...items.map(
                item =>
                    Number(item.id) || 0
            )
        ) + 1
    );
}


// ==================================================
// PAYTM HELPERS
// ==================================================

function paytmIsConfigured() {

    return Boolean(
        PAYTM_MID &&
        PAYTM_MERCHANT_KEY &&
        PAYTM_WEBSITE_NAME &&
        PAYTM_PG_DOMAIN
    );
}


function createOrderId() {

    return (
        "EDUHUB_" +
        Date.now() +
        "_" +
        Math.floor(
            100000 +
            Math.random() * 900000
        )
    );
}


function customerIdFromEmail(email) {

    return (
        "CUST_" +
        String(email || "")
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(0, 30)
    );
}


function releaseReservation(product) {

    const copy = {
        ...product
    };

    delete copy.reservedOrderId;
    delete copy.reservedUntil;

    return copy;
}


// ==================================================
// CALL PAYTM API
// ==================================================

async function callPaytmAPI(
    endpoint,
    body
) {

    const signature =
        await PaytmChecksum.generateSignature(
            JSON.stringify(body),
            PAYTM_MERCHANT_KEY
        );


    const response =
        await fetch(
            `${PAYTM_PG_DOMAIN}${endpoint}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    head: {
                        signature:
                            signature
                    },

                    body:
                        body
                })
            }
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(text);

    } catch (error) {

        throw new Error(
            `Invalid Paytm response: ${text}`
        );
    }


    if (!response.ok) {

        throw new Error(
            `Paytm API HTTP ${response.status}`
        );
    }


    return data;
}


// ==================================================
// GET PAYTM ORDER STATUS
// ==================================================

async function getPaytmOrderStatus(
    orderId
) {

    const body = {

        mid:
            PAYTM_MID,

        orderId:
            orderId
    };


    const response =
        await callPaytmAPI(
            "/v3/order/status",
            body
        );


    const responseBody =
        response.body || {};


    const signature =
        response.head &&
        response.head.signature;


    if (!signature) {

        throw new Error(
            "Paytm response signature is missing"
        );
    }


    const valid =
        await PaytmChecksum.verifySignature(
            JSON.stringify(
                responseBody
            ),
            PAYTM_MERCHANT_KEY,
            signature
        );


    if (!valid) {

        throw new Error(
            "Paytm response checksum verification failed"
        );
    }


    return responseBody;
}


// ==================================================
// PENDING PAYTM ORDER
// ==================================================

function findPendingOrder(
    orderId
) {

    const orders =
        readData(
            paytmOrdersFile
        );


    return orders.find(
        order =>
            String(
                order.orderId
            ) ===
            String(
                orderId
            )
    );
}


function savePendingOrder(
    order
) {

    const orders =
        readData(
            paytmOrdersFile
        );


    const index =
        orders.findIndex(
            item =>
                String(
                    item.orderId
                ) ===
                String(
                    order.orderId
                )
        );


    if (index === -1) {

        orders.push(
            order
        );

    } else {

        orders[index] = {
            ...orders[index],
            ...order
        };
    }


    return writeData(
        paytmOrdersFile,
        orders
    );
}


// ==================================================
// FINALIZE PAYTM ORDER
// ==================================================

async function finalizePaytmOrder(
    orderId,
    statusBody
) {

    const pendingOrder =
        findPendingOrder(
            orderId
        );


    if (!pendingOrder) {

        return {

            success:
                false,

            paymentStatus:
                "UNKNOWN",

            message:
                "Payment order was not found."
        };
    }


    const resultInfo =
        statusBody.resultInfo ||
        {};


    const paymentStatus =
        resultInfo.resultStatus ||
        "";


    const transactions =
        readData(
            transactionsFile
        );


    // Already completed
    const existingTransaction =
        transactions.find(
            transaction =>
                String(
                    transaction.paytmOrderId
                ) ===
                String(
                    orderId
                )
        );


    if (existingTransaction) {

        return {

            success:
                true,

            paymentStatus:
                "TXN_SUCCESS",

            transaction:
                existingTransaction
        };
    }


    // Payment pending
    if (
        paymentStatus ===
        "PENDING"
    ) {

        return {

            success:
                false,

            paymentStatus:
                "PENDING",

            message:
                "Payment is still being confirmed."
        };
    }


    // Payment failed
    if (
        paymentStatus !==
        "TXN_SUCCESS"
    ) {

        const products =
            readData(
                productsFile
            );


        const releaseIndex =
            products.findIndex(
                product =>
                    Number(
                        product.id
                    ) ===
                    Number(
                        pendingOrder.productId
                    ) &&

                    String(
                        product.reservedOrderId ||
                        ""
                    ) ===
                    String(
                        orderId
                    )
            );


        if (
            releaseIndex !==
            -1
        ) {

            products[releaseIndex] =
                releaseReservation(
                    products[
                        releaseIndex
                    ]
                );


            writeData(
                productsFile,
                products
            );
        }


        return {

            success:
                false,

            paymentStatus:
                paymentStatus ||
                "TXN_FAILURE",

            message:
                resultInfo.resultMsg ||
                "Payment failed."
        };
    }


    // ==================================================
    // VERIFY AMOUNT
    // ==================================================

    const expectedAmount =
        Number(
            pendingOrder.amount ||
            0
        );


    const returnedAmount =
        Number(
            statusBody.txnAmount ||
            0
        );


    if (
        !returnedAmount ||
        Math.abs(
            returnedAmount -
            expectedAmount
        ) > 0.001
    ) {

        return {

            success:
                false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment amount verification failed."
        };
    }


    // ==================================================
    // FIND PRODUCT
    // ==================================================

    const products =
        readData(
            productsFile
        );


    const productIndex =
        products.findIndex(
            product =>
                Number(
                    product.id
                ) ===
                Number(
                    pendingOrder.productId
                )
        );


    if (
        productIndex ===
        -1
    ) {

        return {

            success:
                false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Product not found."
        };
    }


    const product =
        products[
            productIndex
        ];


    if (
        product.available ===
        false
    ) {

        return {

            success:
                false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "This product has already been sold."
        };
    }


    // ==================================================
    // CREATE TRANSACTION
    // ==================================================

    const transaction = {

        id:
            getNextId(
                transactions
            ),

        productId:
            product.id,

        productName:
            product.name ||
            product.productName ||
            "Unknown Product",

        amount:
            expectedAmount,

        buyer:
            pendingOrder.buyer ||
            "",

        buyerMobile:
            pendingOrder.mobile ||
            "",

        seller:
            product.seller ||
            product.sellerName ||
            "",

        sellerEmail:
            product.sellerEmail ||
            "",

        status:
            "Completed",

        paymentStatus:
            "TXN_SUCCESS",

        paymentGateway:
            "Paytm",

        paytmOrderId:
            orderId,

        paytmTxnId:
            statusBody.txnId ||
            "",

        bankTxnId:
            statusBody.bankTxnId ||
            "",

        paymentMode:
            statusBody.paymentMode ||
            "",

        gatewayName:
            statusBody.gatewayName ||
            "",

        date:
            new Date().toISOString()
    };


    // Mark product sold
    products[productIndex] = {

        ...releaseReservation(
            product
        ),

        available:
            false,

        status:
            "Sold"
    };


    // Save product
    const productsSaved =
        writeData(
            productsFile,
            products
        );


    if (!productsSaved) {

        return {

            success:
                false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment succeeded but product could not be updated."
        };
    }


    // Save transaction
    transactions.push(
        transaction
    );


    const transactionSaved =
        writeData(
            transactionsFile,
            transactions
        );


    if (!transactionSaved) {

        // Rollback product
        products[
            productIndex
        ] = product;


        writeData(
            productsFile,
            products
        );


        return {

            success:
                false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment succeeded but transaction could not be saved."
        };
    }


    // Update pending order
    savePendingOrder({

        ...pendingOrder,

        status:
            "Completed",

        paymentStatus:
            "TXN_SUCCESS",

        paytmTxnId:
            statusBody.txnId ||
            "",

        completedAt:
            new Date().toISOString()
    });


    console.log(
        "Paytm payment completed:",
        transaction
    );


    return {

        success:
            true,

        paymentStatus:
            "TXN_SUCCESS",

        transaction:
            transaction
    };
}


// ==================================================
// HOME
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            message:
                "EduHub Backend is running",

            paymentGateway:
                "Paytm",

            storage:
                "JSON files",

            splitSettlement:
                false
        });
    }
);


// ==================================================
// DATABASE STATUS
// ==================================================

app.get(
    "/api/database-status",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            database:
                "JSON files",

            mongodb:
                false
        });
    }
);


// ==================================================
// PRODUCTS
// ==================================================

// GET PRODUCTS

app.get(
    "/api/products",
    (req, res) => {

        const products =
            readData(
                productsFile
            );

        res.status(200).json(
            products
        );
    }
);


// ADD PRODUCT

app.post(
    "/api/products",
    (req, res) => {

        try {

            const products =
                readData(
                    productsFile
                );


            const productName =
                String(
                    req.body.productName ||
                    req.body.name ||
                    ""
                ).trim();


            const marketPrice =
                Number(
                    req.body.marketPrice
                );


            const sellingPrice =
                Number(
                    req.body.sellingPrice
                );


            const category =
                String(
                    req.body.category ||
                    "Other"
                ).trim();


            const sellerName =
                String(
                    req.body.sellerName ||
                    req.body.seller ||
                    ""
                ).trim();


            const sellerEmail =
                String(
                    req.body.sellerEmail ||
                    ""
                ).trim();


            if (!productName) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Product name is required"
                });
            }


            if (
                !Number.isFinite(
                    marketPrice
                ) ||
                marketPrice <= 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Valid market price is required"
                });
            }


            if (
                !Number.isFinite(
                    sellingPrice
                ) ||
                sellingPrice <= 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Valid selling price is required"
                });
            }


            if (
                sellingPrice >
                marketPrice
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Selling price cannot be greater than market price"
                });
            }


            if (!sellerName) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Seller name is required"
                });
            }


            const product = {

                id:
                    getNextId(
                        products
                    ),

                productName:
                    productName,

                name:
                    productName,

                marketPrice:
                    marketPrice,

                sellingPrice:
                    sellingPrice,

                category:
                    category,

                sellerName:
                    sellerName,

                seller:
                    sellerName,

                sellerEmail:
                    sellerEmail,

                status:
                    "Available",

                available:
                    true,

                date:
                    new Date().toISOString()
            };


            products.push(
                product
            );


            const saved =
                writeData(
                    productsFile,
                    products
                );


            if (!saved) {

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Could not save product"
                });
            }


            return res.status(201).json({

                success:
                    true,

                message:
                    "Product added successfully",

                product:
                    product
            });

        } catch (error) {

            console.log(
                "Product add error:",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Could not add product"
            });
        }
    }
);


// UPDATE PRODUCT

app.put(
    "/api/products/:id",
    (req, res) => {

        const products =
            readData(
                productsFile
            );


        const id =
            Number(
                req.params.id
            );


        const index =
            products.findIndex(
                product =>
                    Number(
                        product.id
                    ) === id
            );


        if (
            index ===
            -1
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    "Product not found"
            });
        }


        products[index] = {

            ...products[index],

            ...req.body
        };


        const saved =
            writeData(
                productsFile,
                products
            );


        if (!saved) {

            return res.status(500).json({

                success:
                    false,

                message:
                    "Could not update product"
            });
        }


        res.status(200).json({

            success:
                true,

            message:
                "Product updated successfully",

            product:
                products[index]
        });
    }
);


// DELETE PRODUCT

app.delete(
    "/api/products/:id",
    (req, res) => {

        const products =
            readData(
                productsFile
            );


        const id =
            Number(
                req.params.id
            );


        const filtered =
            products.filter(
                product =>
                    Number(
                        product.id
                    ) !== id
            );


        if (
            filtered.length ===
            products.length
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    "Product not found"
            });
        }


        const saved =
            writeData(
                productsFile,
                filtered
            );


        if (!saved) {

            return res.status(500).json({

                success:
                    false,

                message:
                    "Could not delete product"
            });
        }


        res.status(200).json({

            success:
                true,

            message:
                "Product deleted"
        });
    }
);


// ==================================================
// USERS
// ==================================================

app.get(
    "/api/users",
    (req, res) => {

        const users =
            readData(
                usersFile
            );

        res.json(
            users
        );
    }
);


// REGISTER

app.post(
    "/api/users",
    (req, res) => {

        const users =
            readData(
                usersFile
            );


        const name =
            String(
                req.body.name ||
                ""
            ).trim();


        const email =
            String(
                req.body.email ||
                ""
            )
            .trim()
            .toLowerCase();


        const password =
            String(
                req.body.password ||
                ""
            );


        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Name, email and password are required"
            });
        }


        const alreadyExists =
            users.some(
                user =>
                    String(
                        user.email ||
                        ""
                    )
                    .toLowerCase() ===
                    email
            );


        if (alreadyExists) {

            return res.status(409).json({

                success:
                    false,

                message:
                    "Email already registered"
            });
        }


        const user = {

            id:
                getNextId(
                    users
                ),

            name:
                name,

            email:
                email,

            password:
                password,

            date:
                new Date().toISOString()
        };


        users.push(
            user
        );


        const saved =
            writeData(
                usersFile,
                users
            );


        if (!saved) {

            return res.status(500).json({

                success:
                    false,

                message:
                    "Could not save user"
            });
        }


        res.status(201).json({

            success:
                true,

            message:
                "Registration successful",

            user: {

                id:
                    user.id,

                name:
                    user.name,

                email:
                    user.email
            }
        });
    }
);


// LOGIN

app.post(
    "/login",
    (req, res) => {

        const users =
            readData(
                usersFile
            );


        const email =
            String(
                req.body.email ||
                ""
            )
            .trim()
            .toLowerCase();


        const password =
            String(
                req.body.password ||
                ""
            );


        const user =
            users.find(
                item =>
                    String(
                        item.email ||
                        ""
                    )
                    .toLowerCase() ===
                    email &&

                    item.password ===
                    password
            );


        if (!user) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Invalid email or password."
            });
        }


        res.status(200).json({

            success:
                true,

            message:
                "Login successful.",

            user: {

                id:
                    user.id,

                name:
                    user.name,

                email:
                    user.email
            }
        });
    }
);


// ==================================================
// MESSAGES
// ==================================================

app.get(
    "/api/messages",
    (req, res) => {

        const messages =
            readData(
                messagesFile
            );


        const email =
            String(
                req.query.email ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!email) {

            return res.json(
                messages
            );
        }


        const filtered =
            messages.filter(
                message =>
                    String(
                        message.sender ||
                        ""
                    )
                    .toLowerCase() ===
                    email ||

                    String(
                        message.receiver ||
                        ""
                    )
                    .toLowerCase() ===
                    email
            );


        res.json(
            filtered
        );
    }
);


// SEND MESSAGE

app.post(
    "/api/messages",
    (req, res) => {

        try {

            const messages =
                readData(
                    messagesFile
                );


            const sender =
                String(
                    req.body.sender ||
                    ""
                ).trim();


            const receiver =
                String(
                    req.body.receiver ||
                    ""
                ).trim();


            const message =
                String(
                    req.body.message ||
                    ""
                ).trim();


            if (
                !sender ||
                !receiver ||
                !message
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Sender, receiver and message are required."
                });
            }


            const productName =
                req.body.productName ||
                req.body.product ||
                "";


            const newMessage = {

                id:
                    getNextId(
                        messages
                    ),

                sender:
                    sender,

                receiver:
                    receiver,

                productId:
                    req.body.productId ||
                    null,

                productName:
                    productName,

                product:
                    productName,

                message:
                    message,

                replyTo:
                    req.body.replyTo ||
                    null,

                date:
                    new Date().toLocaleString(
                        "en-IN"
                    )
            };


            messages.push(
                newMessage
            );


            const saved =
                writeData(
                    messagesFile,
                    messages
                );


            if (!saved) {

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Could not save message"
                });
            }


            res.status(201).json({

                success:
                    true,

                message:
                    "Message sent successfully",

                data:
                    newMessage
            });

        } catch (error) {

            console.log(
                "Message error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Message could not be saved"
            });
        }
    }
);


// ==================================================
// TRANSACTIONS
// ==================================================

app.get(
    "/api/transactions",
    (req, res) => {

        const transactions =
            readData(
                transactionsFile
            );


        const email =
            String(
                req.query.email ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!email) {

            return res.json(
                transactions
            );
        }


        const filtered =
            transactions.filter(
                transaction =>

                    String(
                        transaction.buyer ||
                        ""
                    )
                    .toLowerCase() ===
                    email ||

                    String(
                        transaction.sellerEmail ||
                        ""
                    )
                    .toLowerCase() ===
                    email
            );


        res.json(
            filtered
        );
    }
);


// Direct transaction creation disabled

app.post(
    "/api/transactions",
    (req, res) => {

        res.status(403).json({

            success:
                false,

            message:
                "Complete payment through Paytm to create a transaction."
        });
    }
);


// ==================================================
// PAYTM CLIENT CONFIG
// ==================================================

app.get(
    "/api/paytm/client-config",
    (req, res) => {

        if (!paytmIsConfigured()) {

            return res.status(503).json({

                success:
                    false,

                message:
                    "Paytm payment is not configured on the backend."
            });
        }


        res.status(200).json({

            success:
                true,

            mid:
                PAYTM_MID,

            checkoutJsUrl:
                `${PAYTM_PG_DOMAIN}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(PAYTM_MID)}.js`
        });
    }
);


// ==================================================
// PAYTM CREATE ORDER
// ==================================================

app.post(
    "/api/paytm/create-order",
    async (req, res) => {

        try {

            if (!paytmIsConfigured()) {

                return res.status(503).json({

                    success:
                        false,

                    message:
                        "Paytm payment is not configured yet."
                });
            }


            const productId =
                Number(
                    req.body.productId
                );


            const buyer =
                String(
                    req.body.buyer ||
                    ""
                ).trim();


            const mobile =
                String(
                    req.body.mobile ||
                    ""
                ).trim();


            if (
                !buyer ||
                !buyer.includes("@")
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A valid buyer email is required."
                });
            }


            if (
                !/^\d{10}$/.test(
                    mobile
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A valid 10-digit mobile number is required."
                });
            }


            let products =
                readData(
                    productsFile
                );


            let product =
                products.find(
                    item =>
                        Number(
                            item.id
                        ) ===
                        productId
                );


            if (!product) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Product not found."
                });
            }


            if (
                product.available ===
                false
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "This product has already been sold."
                });
            }


            const now =
                Date.now();


            const reservedUntil =
                Number(
                    product.reservedUntil ||
                    0
                );


            if (
                product.reservedOrderId &&
                reservedUntil > now
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "This product is currently being purchased by another buyer. Please try again later."
                });
            }


            // Clear expired reservation
            if (
                product.reservedOrderId
            ) {

                product =
                    releaseReservation(
                        product
                    );


                const expiredIndex =
                    products.findIndex(
                        item =>
                            Number(
                                item.id
                            ) ===
                            productId
                    );


                if (
                    expiredIndex !==
                    -1
                ) {

                    products[
                        expiredIndex
                    ] = product;
                }
            }


            const amount =
                Number(
                    product.sellingPrice
                );


            if (
                !Number.isFinite(
                    amount
                ) ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Product has an invalid selling price."
                });
            }


            const orderId =
                createOrderId();


            const amountString =
                amount.toFixed(2);


            // ==================================================
            // PAYTM REQUEST BODY
            // ==================================================

            const body = {

                requestType:
                    "Payment",

                mid:
                    PAYTM_MID,

                websiteName:
                    PAYTM_WEBSITE_NAME,

                orderId:
                    orderId,

                callbackUrl:
                    PAYTM_CALLBACK_URL,

                txnAmount: {

                    value:
                        amountString,

                    currency:
                        "INR"
                },

                userInfo: {

                    custId:
                        customerIdFromEmail(
                            buyer
                        ),

                    mobile:
                        mobile,

                    email:
                        buyer
                }
            };


            // ==================================================
            // INITIATE PAYTM TRANSACTION
            // ==================================================

            const response =
                await callPaytmAPI(

                    `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(PAYTM_MID)}&orderId=${encodeURIComponent(orderId)}`,

                    body
                );


            const responseBody =
                response.body ||
                {};


            const responseSignature =
                response.head &&
                response.head.signature;


            if (
                !responseSignature
            ) {

                return res.status(502).json({

                    success:
                        false,

                    message:
                        "Paytm response signature is missing."
                });
            }


            const valid =
                await PaytmChecksum.verifySignature(

                    JSON.stringify(
                        responseBody
                    ),

                    PAYTM_MERCHANT_KEY,

                    responseSignature
                );


            if (!valid) {

                return res.status(502).json({

                    success:
                        false,

                    message:
                        "Paytm response checksum verification failed."
                });
            }


            const resultInfo =
                responseBody.resultInfo ||
                {};


            if (
                resultInfo.resultStatus &&
                resultInfo.resultStatus !==
                    "S"
            ) {

                return res.status(502).json({

                    success:
                        false,

                    message:
                        resultInfo.resultMsg ||
                        "Paytm could not create the payment order."
                });
            }


            const txnToken =
                responseBody.txnToken;


            if (!txnToken) {

                return res.status(502).json({

                    success:
                        false,

                    message:
                        "Paytm did not return a transaction token."
                });
            }


            // ==================================================
            // RESERVE PRODUCT
            // ==================================================

            const currentProducts =
                readData(
                    productsFile
                );


            const currentIndex =
                currentProducts.findIndex(
                    item =>
                        Number(
                            item.id
                        ) ===
                        productId
                );


            if (
                currentIndex ===
                -1
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "This product is no longer available."
                });
            }


            if (
                currentProducts[
                    currentIndex
                ].available ===
                false
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "This product is no longer available."
                });
            }


            currentProducts[
                currentIndex
            ] = {

                ...currentProducts[
                    currentIndex
                ],

                reservedOrderId:
                    orderId,

                reservedUntil:
                    Date.now() +
                    (
                        20 *
                        60 *
                        1000
                    )
            };


            const reservationSaved =
                writeData(

                    productsFile,

                    currentProducts
                );


            if (
                !reservationSaved
            ) {

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Could not reserve the product for payment."
                });
            }


            // ==================================================
            // SAVE PENDING ORDER
            // ==================================================

            const pendingOrder = {

                orderId:
                    orderId,

                productId:
                    product.id,

                productName:
                    product.name ||
                    product.productName ||
                    "",

                amount:
                    amount,

                buyer:
                    buyer,

                mobile:
                    mobile,

                seller:
                    product.seller ||
                    product.sellerName ||
                    "",

                sellerEmail:
                    product.sellerEmail ||
                    "",

                status:
                    "Created",

                paymentStatus:
                    "PENDING",

                createdAt:
                    new Date().toISOString()
            };


            const orderSaved =
                savePendingOrder(
                    pendingOrder
                );


            if (!orderSaved) {

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Could not save payment order."
                });
            }


            // ==================================================
            // SEND TO FRONTEND
            // ==================================================

            res.status(200).json({

                success:
                    true,

                orderId:
                    orderId,

                txnToken:
                    txnToken,

                amount:
                    amountString,

                mid:
                    PAYTM_MID,

                checkoutJsUrl:
                    `${PAYTM_PG_DOMAIN}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(PAYTM_MID)}.js`
            });


        } catch (error) {

            console.log(
                "Paytm create order error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Could not create Paytm payment order."
            });
        }
    }
);


// ==================================================
// PAYTM VERIFY
// ==================================================

app.post(
    "/api/paytm/verify",
    async (req, res) => {

        try {

            if (
                !paytmIsConfigured()
            ) {

                return res.status(503).json({

                    success:
                        false,

                    message:
                        "Paytm payment is not configured yet."
                });
            }


            const orderId =
                String(
                    req.body.orderId ||
                    ""
                ).trim();


            if (!orderId) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Order ID is required."
                });
            }


            const pendingOrder =
                findPendingOrder(
                    orderId
                );


            if (!pendingOrder) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Payment order not found."
                });
            }


            const statusBody =
                await getPaytmOrderStatus(
                    orderId
                );


            const result =
                await finalizePaytmOrder(

                    orderId,

                    statusBody
                );


            const statusCode =
                result.success ||
                result.paymentStatus ===
                    "PENDING"
                    ? 200
                    : 400;


            res.status(
                statusCode
            ).json(
                result
            );


        } catch (error) {

            console.log(
                "Paytm verification error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Could not verify the Paytm payment."
            });
        }
    }
);


// ==================================================
// PAYTM CALLBACK
// ==================================================

async function handlePaytmCallback(
    req,
    res
) {

    try {

        if (
            !paytmIsConfigured()
        ) {

            return res
                .status(503)
                .send(
                    "Paytm is not configured."
                );
        }


        const callbackData =
            req.method === "GET"

                ? {
                    ...req.query
                }

                : {
                    ...req.body
                };


        const checksum =
            callbackData.CHECKSUMHASH;


        if (!checksum) {

            return res
                .status(400)
                .send(
                    "Invalid Paytm callback."
                );
        }


        const callbackCopy = {
            ...callbackData
        };


        delete callbackCopy.CHECKSUMHASH;


        const valid =
            await PaytmChecksum.verifySignature(

                callbackCopy,

                PAYTM_MERCHANT_KEY,

                checksum
            );


        if (!valid) {

            return res
                .status(400)
                .send(
                    "Payment verification failed."
                );
        }


        const orderId =
            String(
                callbackData.ORDERID ||
                ""
            ).trim();


        if (!orderId) {

            return res
                .status(400)
                .send(
                    "Order ID missing."
                );
        }


        const statusBody =
            await getPaytmOrderStatus(
                orderId
            );


        const result =
            await finalizePaytmOrder(

                orderId,

                statusBody
            );


        const url =
            new URL(
                FRONTEND_URL
            );


        url.searchParams.set(
            "paytm_status",
            result.paymentStatus ||
            "UNKNOWN"
        );


        url.searchParams.set(
            "orderId",
            orderId
        );


        return res.redirect(
            303,
            url.toString()
        );


    } catch (error) {

        console.log(
            "Paytm callback error:",
            error.message
        );


        return res
            .status(500)
            .send(
                "Unable to verify payment."
            );
    }
}


app.post(
    "/paytm/callback",
    handlePaytmCallback
);


app.get(
    "/paytm/callback",
    handlePaytmCallback
);


// ==================================================
// START SERVER
// ==================================================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "EduHub Backend Started"
        );

        console.log(
            "Server running on 0.0.0.0:" +
            PORT
        );

        console.log(
            "Storage: JSON files"
        );

        console.log(
            "Products: /api/products"
        );

        console.log(
            "Messages: /api/messages"
        );

        console.log(
            "Transactions: /api/transactions"
        );

        console.log(
            "Paytm: /api/paytm/create-order"
        );

        console.log(
            "Paytm: /api/paytm/verify"
        );

        console.log(
            "======================================"
        );

        console.log("");
    }
);
