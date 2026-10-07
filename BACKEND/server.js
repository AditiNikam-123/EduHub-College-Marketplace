const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const PaytmChecksum = require("paytmchecksum");

const app = express();

const PORT = process.env.PORT || 10000;

// ==================================================
// PAYTM CONFIGURATION
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
    process.env.FRONTEND_URL || "";

const BACKEND_PUBLIC_URL =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://eduhub-backend-llwi.onrender.com";

const PAYTM_CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    `${BACKEND_PUBLIC_URL}/paytm/callback`;

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: false
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

        const text =
            fs.readFileSync(
                file,
                "utf8"
            ).trim();

        if (!text) {
            return [];
        }

        const data =
            JSON.parse(text);

        return Array.isArray(data)
            ? data
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


function writeData(file, data) {

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

    if (!items.length) {
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

function paytmConfigured() {

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
            1000 +
            Math.random() * 9000
        )
    );
}


function customerId(email) {

    return (
        "CUST_" +
        String(email)
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(
                0,
                30
            )
    );
}


function checkoutJsUrl() {

    return (
        PAYTM_PG_DOMAIN +
        "/merchantpgpui/checkoutjs/merchants/" +
        encodeURIComponent(
            PAYTM_MID
        ) +
        ".js"
    );
}


async function paytmRequest(
    endpoint,
    body
) {

    const signature =
        await PaytmChecksum.generateSignature(
            JSON.stringify(body),
            PAYTM_MERCHANT_KEY
        );

    const payload = {

        head: {
            signature
        },

        body
    };

    const response =
        await fetch(
            `${PAYTM_PG_DOMAIN}${endpoint}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    const raw =
        await response.text();

    let data;

    try {

        data =
            JSON.parse(raw);

    } catch (error) {

        throw new Error(
            "Invalid Paytm response."
        );
    }

    if (!response.ok) {

        throw new Error(
            `Paytm HTTP ${response.status}`
        );
    }

    return data;
}


async function getPaytmStatus(
    orderIdValue
) {

    const body = {

        mid:
            PAYTM_MID,

        orderId:
            orderIdValue
    };

    const response =
        await paytmRequest(
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
            "Paytm response signature missing."
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
            "Paytm response checksum verification failed."
        );
    }

    return responseBody;
}


function findPaytmOrder(
    id
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
            String(id)
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

        orders.push(order);

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


function releaseReservation(
    product
) {

    const copy = {
        ...product
    };

    delete copy.reservedOrderId;

    delete copy.reservedUntil;

    return copy;
}

// ==================================================
// FINALIZE PAYTM PAYMENT
// ==================================================

async function finalizePaytmOrder(
    orderId,
    statusBody
) {

    const pendingOrder =
        findPaytmOrder(
            orderId
        );

    if (!pendingOrder) {

        return {

            success: false,

            paymentStatus:
                "UNKNOWN",

            message:
                "Payment order not found."
        };
    }

    const transactions =
        readData(
            transactionsFile
        );

    const existingTransaction =
        transactions.find(
            transaction =>
                String(
                    transaction.paytmOrderId
                ) ===
                String(orderId)
        );

    if (existingTransaction) {

        return {

            success: true,

            paymentStatus:
                "TXN_SUCCESS",

            transaction:
                existingTransaction
        };
    }

    const resultInfo =
        statusBody.resultInfo || {};

    const paymentStatus =
        resultInfo.resultStatus || "";

    // ------------------------------------------
    // PENDING
    // ------------------------------------------

    if (
        paymentStatus ===
        "PENDING"
    ) {

        return {

            success: false,

            paymentStatus:
                "PENDING",

            message:
                "Payment is still being confirmed."
        };
    }

    // ------------------------------------------
    // FAILURE
    // ------------------------------------------

    if (
        paymentStatus !==
        "TXN_SUCCESS"
    ) {

        const products =
            readData(
                productsFile
            );

        const index =
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
                    String(orderId)
            );

        if (index !== -1) {

            products[index] =
                releaseReservation(
                    products[index]
                );

            writeData(
                productsFile,
                products
            );
        }

        return {

            success: false,

            paymentStatus:
                paymentStatus ||
                "TXN_FAILURE",

            message:
                resultInfo.resultMsg ||
                "Payment failed."
        };
    }

    // ------------------------------------------
    // VERIFY AMOUNT
    // ------------------------------------------

    const expectedAmount =
        Number(
            pendingOrder.amount
        );

    const paidAmount =
        Number(
            statusBody.txnAmount
        );

    if (
        !Number.isFinite(
            expectedAmount
        ) ||
        !Number.isFinite(
            paidAmount
        ) ||
        Math.abs(
            expectedAmount -
            paidAmount
        ) > 0.001
    ) {

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment amount verification failed."
        };
    }

    // ------------------------------------------
    // GET PRODUCT
    // ------------------------------------------

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

    if (productIndex === -1) {

        return {

            success: false,

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

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "This product has already been sold."
        };
    }

    // ------------------------------------------
    // TRANSACTION
    // ------------------------------------------

    const transaction = {

        id:
            nextId(
                transactions
            ),

        productName:
            product.name ||
            product.productName ||
            "Unknown Product",

        productId:
            product.id,

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

    // ------------------------------------------
    // MARK PRODUCT SOLD
    // ------------------------------------------

    products[productIndex] = {

        ...releaseReservation(
            product
        ),

        available:
            false,

        status:
            "Sold"
    };

    const productSaved =
        writeData(
            productsFile,
            products
        );

    if (!productSaved) {

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Could not update product."
        };
    }

    // ------------------------------------------
    // SAVE TRANSACTION
    // ------------------------------------------

    transactions.push(
        transaction
    );

    const transactionSaved =
        writeData(
            transactionsFile,
            transactions
        );

    if (!transactionSaved) {

        products[productIndex] =
            product;

        writeData(
            productsFile,
            products
        );

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Could not save transaction."
        };
    }

    // ------------------------------------------
    // SAVE PAYMENT ORDER STATUS
    // ------------------------------------------

    savePaytmOrder({

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

    return {

        success: true,

        paymentStatus:
            "TXN_SUCCESS",

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

            success: true,

            message:
                "EduHub Backend is running",

            paymentGateway:
                "Paytm"
        });
    }
);

// ==================================================
// PAYTM CLIENT CONFIG
// ==================================================

app.get(
    "/api/paytm/client-config",
    (req, res) => {

        if (!paytmConfigured()) {

            return res
                .status(503)
                .json({

                    success: false,

                    message:
                        "Paytm is not configured on the backend."
                });
        }

        return res.json({

            success: true,

            mid:
                PAYTM_MID,

            checkoutJsUrl:
                checkoutJsUrl()
        });
    }
);

// ==================================================
// CREATE PAYTM ORDER
// ==================================================

app.post(
    "/api/paytm/create-order",
    async (req, res) => {

        try {

            if (!paytmConfigured()) {

                return res
                    .status(503)
                    .json({

                        success: false,

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
                    req.body.buyer || ""
                ).trim();

            const mobile =
                String(
                    req.body.mobile || ""
                ).trim();

            if (
                !buyer ||
                !buyer.includes("@")
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
                    mobile
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
                            "This product has already been sold."
                    });
            }

            const reservedUntil =
                Number(
                    product.reservedUntil ||
                    0
                );

            if (
                product.reservedOrderId &&
                reservedUntil >
                    Date.now()
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This product is currently being purchased by another buyer. Please try again later."
                    });
            }

            if (
                product.reservedOrderId &&
                reservedUntil <=
                    Date.now()
            ) {

                const released =
                    products.map(
                        p =>
                            Number(p.id) ===
                            productId
                                ? releaseReservation(p)
                                : p
                    );

                if (
                    !writeData(
                        productsFile,
                        released
                    )
                ) {

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Could not release old reservation."
                        });
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

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid selling price."
                    });
            }

            const newOrderId =
                createOrderId();

            const amountString =
                amount.toFixed(2);

            const body = {

                requestType:
                    "Payment",

                mid:
                    PAYTM_MID,

                websiteName:
                    PAYTM_WEBSITE_NAME,

                orderId:
                    newOrderId,

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
                        customerId(
                            buyer
                        ),

                    mobile,

                    email:
                        buyer
                }
            };

            const response =
                await paytmRequest(
                    `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(
                        PAYTM_MID
                    )}&orderId=${encodeURIComponent(
                        newOrderId
                    )}`,
                    body
                );

            const responseBody =
                response.body || {};

            const responseSignature =
                response.head &&
                response.head.signature;

            if (!responseSignature) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        message:
                            "Paytm response signature missing."
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

                return res
                    .status(502)
                    .json({

                        success: false,

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

                return res
                    .status(502)
                    .json({

                        success: false,

                        message:
                            resultInfo.resultMsg ||
                            "Paytm could not create the payment order."
                    });
            }

            const txnToken =
                responseBody.txnToken;

            if (!txnToken) {

                return res
                    .status(502)
                    .json({

                        success: false,

                        message:
                            "Paytm did not return a transaction token."
                    });
            }

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
                currentIndex === -1
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This product is no longer available."
                    });
            }

            if (
                currentProducts[
                    currentIndex
                ].available === false
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This product has already been sold."
                    });
            }

            currentProducts[
                currentIndex
            ] = {

                ...currentProducts[
                    currentIndex
                ],

                reservedOrderId:
                    newOrderId,

                reservedUntil:
                    Date.now() +
                    (
                        20 *
                        60 *
                        1000
                    )
            };

            const productReserved =
                writeData(
                    productsFile,
                    currentProducts
                );

            if (!productReserved) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Could not reserve product."
                    });
            }

            const pendingOrder = {

                orderId:
                    newOrderId,

                productId:
                    productId,

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

                status:
                    "Created",

                paymentStatus:
                    "PENDING",

                createdAt:
                    new Date().toISOString()
            };

            if (
                !savePaytmOrder(
                    pendingOrder
                )
            ) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        message:
                            "Could not save payment order."
                    });
            }

            return res.json({

                success: true,

                orderId:
                    newOrderId,

                txnToken:
                    txnToken,

                amount:
                    amountString,

                mid:
                    PAYTM_MID,

                checkoutJsUrl:
                    checkoutJsUrl()
            });

        } catch (error) {

            console.error(
                "Paytm create order error:",
                error.message
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        error.message ||
                        "Could not create Paytm payment order."
                });
        }
    }
);

// ==================================================
// VERIFY PAYTM PAYMENT
// ==================================================

app.post(
    "/api/paytm/verify",
    async (req, res) => {

        try {

            if (!paytmConfigured()) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        message:
                            "Paytm is not configured yet."
                    });
            }

            const id =
                String(
                    req.body.orderId ||
                    ""
                ).trim();

            if (!id) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Order ID is required."
                    });
            }

            const pending =
                findPaytmOrder(
                    id
                );

            if (!pending) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Payment order not found."
                    });
            }

            const statusBody =
                await getPaytmStatus(
                    id
                );

            const result =
                await finalizePaytmOrder(
                    id,
                    statusBody
                );

            const statusCode =
                result.success ||
                result.paymentStatus ===
                    "PENDING"
                    ? 200
                    : 400;

            return res
                .status(
                    statusCode
                )
                .json(result);

        } catch (error) {

            console.error(
                "Paytm verification error:",
                error.message
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Could not verify the Paytm payment."
                });
        }
    }
);

// ==================================================
// PAYTM CALLBACK
// ==================================================

async function paytmCallback(
    req,
    res
) {

    try {

        if (!paytmConfigured()) {

            return res
                .status(503)
                .send(
                    "Paytm is not configured."
                );
        }

        const callbackData =
            req.method === "GET"
                ? { ...req.query }
                : { ...req.body };

        const checksum =
            callbackData.CHECKSUMHASH;

        if (!checksum) {

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
                    "Payment verification failed."
                );
        }

        const id =
            String(
                callbackData.ORDERID ||
                ""
            ).trim();

        if (!id) {

            return res
                .status(400)
                .send(
                    "Order ID missing."
                );
        }

        const statusBody =
            await getPaytmStatus(
                id
            );

        const result =
            await finalizePaytmOrder(
                id,
                statusBody
            );

        if (FRONTEND_URL) {

            const redirectUrl =
                new URL(
                    FRONTEND_URL
                );

            redirectUrl.searchParams.set(
                "paytm_status",
                result.paymentStatus ||
                    "UNKNOWN"
            );

            redirectUrl.searchParams.set(
                "orderId",
                id
            );

            return res.redirect(
                303,
                redirectUrl.toString()
            );
        }

        return res
            .status(200)
            .send(
                result.success
                    ? "Payment successful. Return to EduHub."
                    : "Payment status: " +
                        (
                            result.paymentStatus ||
                            "UNKNOWN"
                        ) +
                        ". Return to EduHub."
            );

    } catch (error) {

        console.error(
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
    paytmCallback
);

app.get(
    "/paytm/callback",
    paytmCallback
);

// ==================================================
// PRODUCTS
// ==================================================

app.get(
    "/api/products",
    (req, res) => {

        res.json(
            readData(
                productsFile
            )
        );
    }
);


app.post(
    "/api/products",
    (req, res) => {

        const products =
            readData(
                productsFile
            );

        const newProduct = {

            id:
                nextId(
                    products
                ),

            productName:
                req.body.productName ||
                req.body.name ||
                "",

            name:
                req.body.name ||
                req.body.productName ||
                "",

            marketPrice:
                Number(
                    req.body.marketPrice
                ) || 0,

            sellingPrice:
                Number(
                    req.body.sellingPrice
                ) || 0,

            category:
                req.body.category ||
                "Other",

            sellerName:
                req.body.sellerName ||
                req.body.seller ||
                "",

            seller:
                req.body.seller ||
                req.body.sellerName ||
                "",

            sellerEmail:
                req.body.sellerEmail ||
                "",

            image:
                req.body.image ||
                "",

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
                        "Could not save product"
                });
        }

        return res
            .status(201)
            .json({

                success: true,

                message:
                    "Product added successfully",

                product:
                    newProduct
            });
    }
);


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

        if (index === -1) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Product not found"
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
                        "Could not update product"
                });
        }

        return res.json({

            success: true,

            message:
                "Product updated successfully",

            product:
                products[index]
        });
    }
);


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

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Product not found"
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
                        "Could not delete product"
                });
        }

        return res.json({

            success: true,

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
                        "Could not save user"
                });
        }

        return res
            .status(201)
            .json({

                success: true,

                message:
                    "User added successfully",

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

        const message = {

            id:
                nextId(
                    messages
                ),

            sender:
                req.body.sender ||
                "",

            receiver:
                req.body.receiver ||
                "",

            productName:
                req.body.productName ||
                req.body.product ||
                "",

            product:
                req.body.product ||
                req.body.productName ||
                "",

            productId:
                req.body.productId ||
                null,

            message:
                req.body.message ||
                "",

            replyTo:
                req.body.replyTo ||
                null,

            date:
                new Date().toLocaleString(
                    "en-IN"
                )
        };

        if (
            !message.sender ||
            !message.receiver ||
            !message.message
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Sender, receiver and message are required"
                });
        }

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
                        "Could not save message"
                });
        }

        return res
            .status(201)
            .json({

                success: true,

                message:
                    "Message sent successfully",

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


// IMPORTANT:
// Direct transaction creation is disabled.
// Transactions are created only after
// successful Paytm verification.

app.post(
    "/api/transactions",
    (req, res) => {

        return res
            .status(403)
            .json({

                success: false,

                message:
                    "Direct transaction creation is disabled. Complete payment through Paytm."
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
            "======================================"
        );

        console.log(
            "EduHub Backend Started"
        );

        console.log(
            "Server running on port:",
            PORT
        );

        console.log(
            "Payment Gateway: Paytm"
        );

        console.log(
            "======================================"
        );
    }
);
