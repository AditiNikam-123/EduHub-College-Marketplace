const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const PaytmChecksum = require("paytmchecksum");

const app = express();

// ==================================================
// PORT
// ==================================================

const PORT =
    process.env.PORT || 10000;

// ==================================================
// PAYTM CONFIG
// ==================================================

const PAYTM_ENVIRONMENT =
    process.env.PAYTM_ENVIRONMENT ||
    "staging";

const PAYTM_MID =
    process.env.PAYTM_MID ||
    "";

const PAYTM_MERCHANT_KEY =
    process.env.PAYTM_MERCHANT_KEY ||
    "";

const PAYTM_WEBSITE_NAME =
    process.env.PAYTM_WEBSITE_NAME ||
    "WEBSTAGING";

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eduhub-college-marketplace.onrender.com";

const BACKEND_URL =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://eduhub-backend-llwi.onrender.com";

const PAYTM_BASE_URL =
    PAYTM_ENVIRONMENT === "production"
        ? "https://secure.paytmpayments.com"
        : "https://securestage.paytmpayments.com";

const PAYTM_CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    `${BACKEND_URL}/paytm/callback`;

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

// ==================================================
// DATA FILES
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
        }

        const data =
            fs.readFileSync(
                file,
                "utf8"
            ).trim();

        if (!data) {

            return [];
        }

        const parsed =
            JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
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

        console.error(
            "Write error:",
            file,
            error.message
        );

        return false;
    }
}


function nextId(items) {

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
                    Number(
                        item.id
                    ) || 0
            )
        ) + 1
    );
}


// ==================================================
// PAYTM HELPERS
// ==================================================

function paytmConfigured() {

    return Boolean(
        PAYTM_MID &&
        PAYTM_MERCHANT_KEY
    );
}


function createOrderId() {

    return (
        "EDUHUB_" +
        Date.now() +
        "_" +
        Math.floor(
            1000 +
            Math.random() * 9000
        )
    );
}


function createCustomerId(
    email
) {

    return (
        "EDU_" +
        String(email)
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(
                0,
                40
            )
    );
}


async function generatePaytmSignature(
    body
) {

    return PaytmChecksum.generateSignature(
        JSON.stringify(body),
        PAYTM_MERCHANT_KEY
    );
}


function savePaytmOrder(
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


function getPaytmOrder(
    orderId
) {

    const orders =
        readData(
            paytmOrdersFile
        );

    return orders.find(
        item =>
            String(
                item.orderId
            ) ===
            String(
                orderId
            )
    );
}


// ==================================================
// HOME
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "EduHub Backend is running",

            paymentGateway:
                "Paytm",

            splitSettlement:
                true
        });
    }
);


// ==================================================
// PAYTM CONFIG STATUS
// ==================================================

app.get(
    "/api/paytm/config-status",
    (req, res) => {

        res.json({

            success:
                paytmConfigured(),

            environment:
                PAYTM_ENVIRONMENT,

            splitSettlement:
                true,

            configured:
                paytmConfigured()
        });
    }
);


// ==================================================
// PRODUCTS
// ==================================================

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


// ==================================================
// ADD PRODUCT
// ==================================================

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

            const sellerPaytmMid =
                String(
                    req.body.sellerPaytmMid ||
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

            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!productName) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Product name is required."
                    });
            }

            if (
                !sellerName
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Seller name is required."
                    });
            }

            if (
                !sellerEmail ||
                !sellerEmail.includes("@")
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Valid seller email is required."
                    });
            }

            if (
                !sellerPaytmMid
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Seller Paytm Child MID is required for Split Settlement."
                    });
            }

            if (
                !Number.isFinite(
                    marketPrice
                ) ||
                marketPrice <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid market price."
                    });
            }

            if (
                !Number.isFinite(
                    sellingPrice
                ) ||
                sellingPrice <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid selling price."
                    });
            }

            if (
                sellingPrice >
                marketPrice
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Selling price cannot be greater than market price."
                    });
            }

            const newProduct = {

                id:
                    nextId(
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

                // IMPORTANT
                sellerPaytmMid:
                    sellerPaytmMid,

                status:
                    "Available",

                available:
                    true,

                date:
                    new Date().toISOString()
            };

            products.push(
                newProduct
            );

            const saved =
                writeData(
                    productsFile,
                    products
                );

            if (!saved) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Could not save product."
                    });
            }

            return res
                .status(201)
                .json({

                    success: true,

                    message:
                        "Product listed successfully.",

                    product:
                        newProduct
                });

        } catch (error) {

            console.error(
                "Add product error:",
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not add product."
                });
        }
    }
);


// ==================================================
// UPDATE PRODUCT
// ==================================================

app.put(
    "/api/products/:id",
    (req, res) => {

        try {

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
                index === -1
            ) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Product not found."
                    });
            }

            products[index] = {

                ...products[index],

                ...req.body
            };

            if (
                !writeData(
                    productsFile,
                    products
                )
            ) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Could not update product."
                    });
            }

            return res.json({

                success: true,

                product:
                    products[index]
            });

        } catch (error) {

            console.error(
                "Update product error:",
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not update product."
                });
        }
    }
);


// ==================================================
// DELETE PRODUCT
// ==================================================

app.delete(
    "/api/products/:id",
    (req, res) => {

        try {

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

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Product not found."
                    });
            }

            if (
                !writeData(
                    productsFile,
                    filtered
                )
            ) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Could not delete product."
                    });
            }

            return res.json({

                success: true,

                message:
                    "Product deleted."
            });

        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not delete product."
                });
        }
    }
);


// ==================================================
// CREATE PAYTM SPLIT PAYMENT LINK
// ==================================================

app.post(
    "/api/paytm/create-payment",
    async (req, res) => {

        try {

            if (
                !paytmConfigured()
            ) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        message:
                            "Paytm is not configured. Add PAYTM_MID and PAYTM_MERCHANT_KEY in Render."
                    });
            }

            const productId =
                Number(
                    req.body.productId
                );

            const buyerEmail =
                String(
                    req.body.buyerEmail ||
                    ""
                ).trim();

            const buyerMobile =
                String(
                    req.body.buyerMobile ||
                    ""
                ).trim();

            if (
                !Number.isInteger(
                    productId
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid product."
                    });
            }

            if (
                !buyerEmail ||
                !buyerEmail.includes("@")
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Enter a valid buyer email."
                    });
            }

            if (
                !/^\d{10}$/.test(
                    buyerMobile
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Enter a valid 10-digit mobile number."
                    });
            }

            const products =
                readData(
                    productsFile
                );

            const product =
                products.find(
                    item =>
                        Number(
                            item.id
                        ) ===
                        productId
                );

            if (!product) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Product not found."
                    });
            }

            if (
                product.available ===
                false
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This product is already sold."
                    });
            }

            const sellerPaytmMid =
                String(
                    product.sellerPaytmMid ||
                    ""
                ).trim();

            if (
                !sellerPaytmMid
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "This seller does not have a Paytm Child MID configured."
                    });
            }

            const amount =
                Number(
                    product.sellingPrice
                );

            if (
                !Number.isFinite(
                    amount
                ) ||
                amount < 1
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid selling price."
                    });
            }

            const orderId =
                createOrderId();

            // ==================================================
            // PAYTM CREATE LINK REQUEST
            // ==================================================
            //
            // 100% of customer payment is assigned
            // to the seller child MID.
            //
            // ==================================================

            const requestBody = {

                merchantRequestId:
                    orderId,

                mid:
                    PAYTM_MID,

                linkName:
                    (
                        "EduHub - " +
                        (
                            product.name ||
                            "Product"
                        )
                    ).slice(
                        0,
                        64
                    ),

                linkDescription:
                    "EduHub Marketplace Payment",

                linkType:
                    "FIXED",

                amount:
                    Number(
                        amount
                    ).toFixed(2),

                customerContact: {

                    customerName:
                        buyerEmail.split(
                            "@"
                        )[0],

                    customerEmail:
                        buyerEmail,

                    customerMobile:
                        buyerMobile,

                    customerId:
                        createCustomerId(
                            buyerEmail
                        )
                },

                statusCallbackUrl:
                    PAYTM_CALLBACK_URL,

                linkOrderId:
                    orderId,

                singleTransactionOnly:
                    true,

                // ==================================================
                // SPLIT SETTLEMENT
                // ==================================================

                splitSettlementInfo: {

                    splitMethod:
                        "PERCENTAGE",

                    splitInfo: [

                        {

                            // Seller's Paytm child/vendor MID
                            mid:
                                sellerPaytmMid,

                            // Seller receives 100%
                            percentage:
                                "100"
                        }
                    ]
                },

                redirectionUrlSuccess:
                    `${FRONTEND_URL}?paytm_status=success&orderId=${encodeURIComponent(
                        orderId
                    )}`,

                redirectionUrlFailure:
                    `${FRONTEND_URL}?paytm_status=failure&orderId=${encodeURIComponent(
                        orderId
                    )}`,

                customPaymentSuccessMessage:
                    "Payment successful. Your EduHub purchase has been completed."
            };

            const signature =
                await generatePaytmSignature(
                    requestBody
                );

            const requestPayload = {

                head: {

                    tokenType:
                        "AES",

                    signature:
                        signature
                },

                body:
                    requestBody
            };

            const response =
                await fetch(
                    `${PAYTM_BASE_URL}/link/create`,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestPayload
                            )
                    }
                );

            const data =
                await response.json();

            console.log(
                "Paytm Create Link Response:",
                data
            );

            const resultInfo =
                data &&
                data.body &&
                data.body.resultInfo
                    ? data.body.resultInfo
                    : {};

            if (
                !response.ok ||
                resultInfo.resultStatus !==
                    "SUCCESS"
            ) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        message:
                            resultInfo.resultMessage ||
                            "Paytm could not create the payment link."
                    });
            }

            const paymentUrl =
                data.body.shortUrl;

            if (!paymentUrl) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        message:
                            "Paytm payment URL was not returned."
                    });
            }

            // ==================================================
            // SAVE PENDING ORDER
            // ==================================================

            savePaytmOrder({

                orderId,

                productId,

                productName:
                    product.name ||
                    product.productName ||
                    "",

                amount,

                buyerEmail,

                buyerMobile,

                seller:
                    product.seller ||
                    product.sellerName ||
                    "",

                sellerEmail:
                    product.sellerEmail ||
                    "",

                sellerPaytmMid,

                paymentGateway:
                    "Paytm",

                splitPercentage:
                    100,

                status:
                    "Created",

                paymentStatus:
                    "PENDING",

                createdAt:
                    new Date().toISOString()
            });

            return res.json({

                success: true,

                orderId,

                paymentUrl
            });

        } catch (error) {

            console.error(
                "Create Paytm payment error:",
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        error.message ||
                        "Could not create Paytm payment."
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

        const callbackData = {

            ...req.body
        };

        const checksum =
            callbackData.CHECKSUMHASH;

        delete callbackData.CHECKSUMHASH;

        if (
            !checksum
        ) {

            return res
                .status(400)
                .send(
                    "Invalid Paytm callback."
                );
        }

        const valid =
            await PaytmChecksum.verifySignature(
                callbackData,
                PAYTM_MERCHANT_KEY,
                checksum
            );

        if (!valid) {

            return res
                .status(400)
                .send(
                    "Invalid Paytm checksum."
                );
        }

        const orderId =
            String(
                callbackData.ORDERID ||
                ""
            ).trim();

        const status =
            String(
                callbackData.STATUS ||
                ""
            ).trim();

        const txnAmount =
            Number(
                callbackData.TXNAMOUNT ||
                0
            );

        if (!orderId) {

            return res
                .status(400)
                .send(
                    "Order ID missing."
                );
        }

        const pendingOrder =
            getPaytmOrder(
                orderId
            );

        if (!pendingOrder) {

            return res
                .status(404)
                .send(
                    "EduHub payment order not found."
                );
        }

        // ==================================================
        // FAILURE / PENDING
        // ==================================================

        if (
            status !==
            "TXN_SUCCESS"
        ) {

            savePaytmOrder({

                ...pendingOrder,

                paymentStatus:
                    status ||
                    "PENDING",

                paytmTxnId:
                    callbackData.TXNID ||
                    "",

                callbackUpdatedAt:
                    new Date().toISOString()
            });

            return redirectAfterPayment(
                res,
                orderId,
                status ||
                    "PENDING"
            );
        }

        // ==================================================
        // AMOUNT VERIFICATION
        // ==================================================

        if (
            Math.abs(
                Number(
                    pendingOrder.amount
                ) -
                txnAmount
            ) > 0.001
        ) {

            savePaytmOrder({

                ...pendingOrder,

                paymentStatus:
                    "AMOUNT_MISMATCH"
            });

            return res
                .status(400)
                .send(
                    "Payment amount mismatch."
                );
        }

        // ==================================================
        // PRODUCT
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

            return res
                .status(404)
                .send(
                    "Product not found."
                );
        }

        // ==================================================
        // DUPLICATE SUCCESS PROTECTION
        // ==================================================

        const transactions =
            readData(
                transactionsFile
            );

        const existing =
            transactions.find(
                transaction =>
                    String(
                        transaction.paytmOrderId
                    ) ===
                    String(
                        orderId
                    )
            );

        if (existing) {

            return redirectAfterPayment(
                res,
                orderId,
                "TXN_SUCCESS"
            );
        }

        // ==================================================
        // ENSURE PRODUCT IS STILL AVAILABLE
        // ==================================================

        if (
            products[
                productIndex
            ].available ===
            false
        ) {

            return res
                .status(409)
                .send(
                    "Product was already sold."
                );
        }

        // ==================================================
        // MARK SOLD
        // ==================================================

        products[
            productIndex
        ] = {

            ...products[
                productIndex
            ],

            available:
                false,

            status:
                "Sold"
        };

        const productsSaved =
            writeData(
                productsFile,
                products
            );

        if (!productsSaved) {

            return res
                .status(500)
                .send(
                    "Could not update product."
                );
        }

        // ==================================================
        // SAVE TRANSACTION
        // ==================================================

        const transaction = {

            id:
                nextId(
                    transactions
                ),

            productName:
                pendingOrder.productName,

            productId:
                pendingOrder.productId,

            amount:
                pendingOrder.amount,

            buyer:
                pendingOrder.buyerEmail,

            buyerMobile:
                pendingOrder.buyerMobile,

            seller:
                pendingOrder.seller,

            sellerEmail:
                pendingOrder.sellerEmail,

            sellerPaytmMid:
                pendingOrder.sellerPaytmMid,

            paymentGateway:
                "Paytm",

            paymentStatus:
                "TXN_SUCCESS",

            status:
                "Completed",

            splitSettlement:
                true,

            sellerSettlementPercentage:
                100,

            paytmOrderId:
                orderId,

            paytmTxnId:
                callbackData.TXNID ||
                "",

            bankTxnId:
                callbackData.BANKTXNID ||
                "",

            paymentMode:
                callbackData.PAYMENTMODE ||
                "",

            gatewayName:
                callbackData.GATEWAYNAME ||
                "",

            transactionDate:
                callbackData.TXNDATE ||
                "",

            date:
                new Date().toISOString()
        };

        transactions.push(
            transaction
        );

        const transactionSaved =
            writeData(
                transactionsFile,
                transactions
            );

        if (!transactionSaved) {

            return res
                .status(500)
                .send(
                    "Could not save transaction."
                );
        }

        // ==================================================
        // SAVE COMPLETED PAYTM ORDER
        // ==================================================

        savePaytmOrder({

            ...pendingOrder,

            status:
                "Completed",

            paymentStatus:
                "TXN_SUCCESS",

            paytmTxnId:
                callbackData.TXNID ||
                "",

            completedAt:
                new Date().toISOString()
        });

        return redirectAfterPayment(
            res,
            orderId,
            "TXN_SUCCESS"
        );

    } catch (error) {

        console.error(
            "Paytm callback error:",
            error
        );

        return res
            .status(500)
            .send(
                "Payment callback failed."
            );
    }
}


// ==================================================
// REDIRECT AFTER PAYMENT
// ==================================================

function redirectAfterPayment(
    res,
    orderId,
    status
) {

    const url =
        new URL(
            FRONTEND_URL
        );

    url.searchParams.set(
        "paytm_status",
        status
    );

    url.searchParams.set(
        "orderId",
        orderId
    );

    return res.redirect(
        303,
        url.toString()
    );
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
// CHECK PAYMENT RESULT FROM EDUHUB
// ==================================================

app.get(
    "/api/paytm/order/:orderId",
    (req, res) => {

        const order =
            getPaytmOrder(
                req.params.orderId
            );

        if (!order) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Payment order not found."
                });
        }

        return res.json({

            success: true,

            order
        });
    }
);


// ==================================================
// USERS
// ==================================================

app.get(
    "/api/users",
    (req, res) => {

        res.json(
            readData(
                usersFile
            )
        );
    }
);


app.post(
    "/api/users",
    (req, res) => {

        const users =
            readData(
                usersFile
            );

        const user = {

            id:
                nextId(
                    users
                ),

            name:
                req.body.name ||
                "",

            email:
                req.body.email ||
                "",

            password:
                req.body.password ||
                "",

            date:
                new Date().toISOString()
        };

        users.push(
            user
        );

        if (
            !writeData(
                usersFile,
                users
            )
        ) {

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not save user."
                });
        }

        return res
            .status(201)
            .json({

                success: true,

                user
            });
    }
);


// ==================================================
// MESSAGES
// ==================================================

app.get(
    "/api/messages",
    (req, res) => {

        res.json(
            readData(
                messagesFile
            )
        );
    }
);


app.post(
    "/api/messages",
    (req, res) => {

        const messages =
            readData(
                messagesFile
            );

        if (
            !req.body.sender ||
            !req.body.receiver ||
            !req.body.message
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Sender, receiver and message are required."
                });
        }

        const message = {

            id:
                nextId(
                    messages
                ),

            sender:
                req.body.sender,

            receiver:
                req.body.receiver,

            productName:
                req.body.productName ||
                "",

            product:
                req.body.product ||
                req.body.productName ||
                "",

            productId:
                req.body.productId ||
                null,

            message:
                req.body.message,

            replyTo:
                req.body.replyTo ||
                null,

            date:
                new Date().toLocaleString(
                    "en-IN"
                )
        };

        messages.push(
            message
        );

        if (
            !writeData(
                messagesFile,
                messages
            )
        ) {

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not save message."
                });
        }

        return res
            .status(201)
            .json({

                success: true,

                message:
                    "Message sent successfully.",

                data:
                    message
            });
    }
);


// ==================================================
// TRANSACTIONS
// ==================================================

app.get(
    "/api/transactions",
    (req, res) => {

        res.json(
            readData(
                transactionsFile
            )
        );
    }
);


// Direct transaction creation is NOT allowed.
// It must come from successful Paytm callback.

app.post(
    "/api/transactions",
    (req, res) => {

        return res
            .status(403)
            .json({

                success: false,

                message:
                    "Transactions are created only after successful Paytm payment verification."
            });
    }
);


// ==================================================
// SERVER
// ==================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "EduHub Backend Started"
        );

        console.log(
            "Port:",
            PORT
        );

        console.log(
            "Paytm Environment:",
            PAYTM_ENVIRONMENT
        );

        console.log(
            "Split Settlement:",
            "Enabled in code"
        );

        console.log(
            "========================================"
        );
    }
);
