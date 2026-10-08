const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const PaytmChecksum = require("paytmchecksum");

const app = express();

// ========================================
// PORT
// ========================================

const PORT = process.env.PORT || 10000;

// ========================================
// PAYTM CONFIG
// ========================================

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

const BACKEND_PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    "https://eduhub-backend-llwi.onrender.com";

const PAYTM_CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    `${BACKEND_PUBLIC_URL}/paytm/callback`;

const FRONTEND_URL =
    process.env.FRONTEND_URL || "";

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: false
    })
);

// ========================================
// DATA FILES
// ========================================

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

// ========================================
// FILE FUNCTIONS
// ========================================

function readData(file) {

    try {

        if (!fs.existsSync(file)) {

            fs.writeFileSync(
                file,
                "[]"
            );

            return [];

        }

        const data =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!data.trim()) {

            return [];

        }

        const parsed =
            JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.log(
            "File read error:",
            file
        );

        console.log(
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
            "File write error:",
            error.message
        );

        return false;

    }

}


function getNextId(items) {

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


// ========================================
// PAYTM HELPERS
// ========================================

function paytmIsConfigured() {

    return Boolean(
        PAYTM_MID &&
        PAYTM_MERCHANT_KEY &&
        PAYTM_WEBSITE_NAME &&
        PAYTM_PG_DOMAIN
    );

}


function formatAmount(value) {

    return Number(value)
        .toFixed(2);

}


function createOrderId() {

    const random =
        Math.floor(
            100000 +
            Math.random() *
            900000
        );

    return (
        `EDUHUB_${Date.now()}_${random}`
    );

}


function customerIdFromEmail(
    email
) {

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


async function generatePaytmSignature(
    body
) {

    return await PaytmChecksum
        .generateSignature(
            JSON.stringify(body),
            PAYTM_MERCHANT_KEY
        );

}


async function verifyPaytmBodySignature(
    body,
    signature
) {

    if (!signature) {

        return false;

    }

    return await PaytmChecksum
        .verifySignature(
            JSON.stringify(body),
            PAYTM_MERCHANT_KEY,
            signature
        );

}


async function callPaytmAPI(
    endpoint,
    body
) {

    const signature =
        await generatePaytmSignature(
            body
        );


    const requestPayload = {

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
                        requestPayload
                    )

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


async function getPaytmOrderStatus(
    orderId
) {

    const body = {

        mid:
            PAYTM_MID,

        orderId

    };


    const response =
        await callPaytmAPI(
            "/v3/order/status",
            body
        );


    const responseBody =
        response.body || {};


    const responseSignature =
        response.head &&
        response.head.signature;


    if (!responseSignature) {

        throw new Error(
            "Paytm response signature is missing"
        );

    }


    const valid =
        await verifyPaytmBodySignature(
            responseBody,
            responseSignature
        );


    if (!valid) {

        throw new Error(
            "Paytm response checksum verification failed"
        );

    }


    return responseBody;

}


// ========================================
// PAYTM ORDER HELPERS
// ========================================

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
            String(orderId)
    );

}


function releaseProductReservation(
    product
) {

    const copy = {
        ...product
    };


    delete copy.reservedOrderId;

    delete copy.reservedUntil;


    return copy;

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
                String(order.orderId)
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


// ========================================
// FINALIZE PAYTM ORDER
// ========================================

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

            success: false,

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


    // Already completed
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


    // Payment pending
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


    // Payment failed
    if (
        paymentStatus !==
        "TXN_SUCCESS"
    ) {

        const productsForRelease =
            readData(
                productsFile
            );


        const releaseIndex =
            productsForRelease.findIndex(
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


        if (
            releaseIndex !==
            -1
        ) {

            productsForRelease[
                releaseIndex
            ] =
                releaseProductReservation(
                    productsForRelease[
                        releaseIndex
                    ]
                );


            writeData(
                productsFile,
                productsForRelease
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


    // ==================================
    // VERIFY AMOUNT
    // ==================================

    const returnedAmount =
        Number(
            statusBody.txnAmount ||
            0
        );


    const expectedAmount =
        Number(
            pendingOrder.amount ||
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

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment amount verification failed."

        };

    }


    // ==================================
    // LOAD PRODUCTS
    // ==================================

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


    // ==================================
    // CREATE TRANSACTION
    // ==================================

    const transaction = {

        id:
            getNextId(
                transactions
            ),


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


        productId:
            product.id,


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


    // ==================================
    // MARK PRODUCT SOLD
    // ==================================

    products[
        productIndex
    ] = {

        ...releaseProductReservation(
            product
        ),

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

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment succeeded but product could not be updated."

        };

    }


    // ==================================
    // SAVE TRANSACTION
    // ==================================

    transactions.push(
        transaction
    );


    const transactionSaved =
        writeData(
            transactionsFile,
            transactions
        );


    if (!transactionSaved) {

        // Rollback product state

        products[
            productIndex
        ] = product;


        writeData(
            productsFile,
            products
        );


        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Payment succeeded but transaction could not be saved."

        };

    }


    // ==================================
    // UPDATE PENDING ORDER
    // ==================================

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

        success: true,

        paymentStatus:
            "TXN_SUCCESS",

        transaction

    };

}


// ========================================
// HOME
// ========================================

app.get(
    "/",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            message:
                "EduHub Backend is running",

            port:
                PORT,

            paymentGateway:
                "Paytm"

        });

    }
);


// ========================================
// PAYTM CLIENT CONFIG
// ========================================

app.get(
    "/api/paytm/client-config",
    (req, res) => {

        if (
            !paytmIsConfigured()
        ) {

            return res.status(
                503
            ).json({

                success:
                    false,

                message:
                    "Paytm is not configured on the backend."

            });

        }


        return res.status(
            200
        ).json({

            success:
                true,

            mid:
                PAYTM_MID,

            checkoutJsUrl:

                `${PAYTM_PG_DOMAIN}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(PAYTM_MID)}.js`

        });

    }
);


// ========================================
// PAYTM CREATE ORDER
// ========================================

app.post(
    "/api/paytm/create-order",
    async (req, res) => {

        try {

            if (
                !paytmIsConfigured()
            ) {

                return res.status(
                    503
                ).json({

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


            // ==============================
            // VALIDATE BUYER
            // ==============================

            if (
                !buyer ||
                !buyer.includes("@")
            ) {

                return res.status(
                    400
                ).json({

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

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "A valid 10-digit mobile number is required."

                });

            }


            // ==============================
            // FIND PRODUCT
            // ==============================

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

                return res.status(
                    404
                ).json({

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

                return res.status(
                    409
                ).json({

                    success:
                        false,

                    message:
                        "This product has already been sold."

                });

            }


            // ==============================
            // CHECK RESERVATION
            // ==============================

            const now =
                Date.now();


            const reservedUntil =
                Number(
                    product.reservedUntil ||
                    0
                );


            if (
                product.reservedOrderId &&
                reservedUntil >
                now
            ) {

                return res.status(
                    409
                ).json({

                    success:
                        false,

                    message:
                        "This product is currently being purchased by another buyer. Please try again later."

                });

            }


            // Release expired reservation

            if (
                product.reservedOrderId &&
                reservedUntil <=
                now
            ) {

                const releasedProduct =
                    releaseProductReservation(
                        product
                    );


                const releaseIndex =
                    products.findIndex(
                        item =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                product.id
                            )
                    );


                if (
                    releaseIndex !==
                    -1
                ) {

                    products[
                        releaseIndex
                    ] =
                        releasedProduct;


                    writeData(
                        productsFile,
                        products
                    );

                }

            }


            // ==============================
            // AMOUNT
            // ==============================

            const amount =
                Number(
                    product.sellingPrice
                );


            if (
                !Number.isFinite(
                    amount
                ) ||
                amount <=
                0
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Product has an invalid selling price."

                });

            }


            // ==============================
            // ORDER
            // ==============================

            const orderId =
                createOrderId();


            const amountString =
                formatAmount(
                    amount
                );


            const body = {

                requestType:
                    "Payment",

                mid:
                    PAYTM_MID,

                websiteName:
                    PAYTM_WEBSITE_NAME,

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

                    mobile,

                    email:
                        buyer

                }

            };


            // ==============================
            // CALL PAYTM
            // ==============================

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

                return res.status(
                    502
                ).json({

                    success:
                        false,

                    message:
                        "Paytm response signature is missing."

                });

            }


            const valid =
                await verifyPaytmBodySignature(

                    responseBody,

                    responseSignature

                );


            if (!valid) {

                return res.status(
                    502
                ).json({

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

                return res.status(
                    502
                ).json({

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

                return res.status(
                    502
                ).json({

                    success:
                        false,

                    message:
                        "Paytm did not return a transaction token."

                });

            }


            // ==============================
            // SAVE PENDING ORDER
            // ==============================

            const pendingOrder = {

                orderId,

                productId:
                    product.id,

                productName:
                    product.name ||
                    product.productName ||
                    "",

                amount,

                buyer,

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


            const currentProducts =
                readData(
                    productsFile
                );


            const currentProductIndex =
                currentProducts.findIndex(
                    item =>
                        Number(
                            item.id
                        ) ===
                        Number(
                            product.id
                        )
                );


            if (
                currentProductIndex ===
                -1 ||
                currentProducts[
                    currentProductIndex
                ].available ===
                false
            ) {

                return res.status(
                    409
                ).json({

                    success:
                        false,

                    message:
                        "This product is no longer available."

                });

            }


            // Reserve product for 20 minutes

            currentProducts[
                currentProductIndex
            ] = {

                ...currentProducts[
                    currentProductIndex
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

                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not reserve the product for payment."

                });

            }


            const saved =
                savePendingOrder(
                    pendingOrder
                );


            if (!saved) {

                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not save payment order."

                });

            }


            return res.status(
                200
            ).json({

                success:
                    true,

                orderId,

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


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    "Could not create Paytm payment order."

            });

        }

    }
);


// ========================================
// PAYTM VERIFY
// ========================================

app.post(
    "/api/paytm/verify",
    async (req, res) => {

        try {

            if (
                !paytmIsConfigured()
            ) {

                return res.status(
                    503
                ).json({

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

                return res.status(
                    400
                ).json({

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

                return res.status(
                    404
                ).json({

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


            return res.status(

                result.success

                    ? 200

                    : result.paymentStatus ===
                      "PENDING"

                        ? 200

                        : 400

            ).json(
                result
            );


        } catch (error) {


            console.log(
                "Paytm verification error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not verify the Paytm payment."

            });

        }

    }
);


// ========================================
// PAYTM CALLBACK
// ========================================

async function handlePaytmCallback(
    req,
    res
) {

    try {

        if (
            !paytmIsConfigured()
        ) {

            return res.status(
                503
            ).send(
                "Paytm is not configured."
            );

        }


        const callbackData =
            req.method ===
            "GET"

                ? {
                    ...req.query
                }

                : {
                    ...req.body
                };


        const checksum =
            callbackData.CHECKSUMHASH;


        if (!checksum) {

            return res.status(
                400
            ).send(
                "Invalid Paytm callback."
            );

        }


        const valid =
            await PaytmChecksum
                .verifySignature(

                    callbackData,

                    PAYTM_MERCHANT_KEY,

                    checksum

                );


        if (!valid) {

            console.log(
                "Paytm callback checksum mismatch"
            );


            return res.status(
                400
            ).send(
                "Payment verification failed."
            );

        }


        const orderId =
            String(
                callbackData.ORDERID ||
                ""
            ).trim();


        if (!orderId) {

            return res.status(
                400
            ).send(
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


        if (FRONTEND_URL) {

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

        }


        return res.status(
            200
        ).send(`

            <html>

                <head>

                    <title>
                        EduHub Payment
                    </title>

                </head>

                <body style="
                    font-family:Arial;
                    padding:40px;
                    text-align:center;
                ">

                    <h2>
                        EduHub Payment
                    </h2>

                    <p>
                        ${
                            result.success
                                ? "Payment successful."
                                : result.paymentStatus ===
                                  "PENDING"
                                    ? "Payment is pending."
                                    : "Payment failed."
                        }
                    </p>

                    <p>
                        You can close this page
                        and return to EduHub.
                    </p>

                </body>

            </html>

        `);


    } catch (error) {


        console.log(
            "Paytm callback error:",
            error.message
        );


        return res.status(
            500
        ).send(
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


// ========================================
// PRODUCTS
// ========================================

app.get(
    "/api/products",
    (req, res) => {

        const products =
            readData(
                productsFile
            );


        return res.status(
            200
        ).json(
            products
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
                getNextId(
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

            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not save product"

            });

        }


        return res.status(
            201
        ).json({

            success:
                true,

            message:
                "Product added successfully",

            product:
                newProduct

        });

    }
);


// ========================================
// UPDATE PRODUCT
// ========================================

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

            return res.status(
                404
            ).json({

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

            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not update product"

            });

        }


        return res.status(
            200
        ).json({

            success:
                true,

            message:
                "Product updated successfully",

            product:
                products[index]

        });

    }
);


// ========================================
// DELETE PRODUCT
// ========================================

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


        const newProducts =
            products.filter(
                product =>
                    Number(
                        product.id
                    ) !== id
            );


        if (
            newProducts.length ===
            products.length
        ) {

            return res.status(
                404
            ).json({

                success:
                    false,

                message:
                    "Product not found"

            });

        }


        const saved =
            writeData(
                productsFile,
                newProducts
            );


        if (!saved) {

            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not delete product"

            });

        }


        return res.status(
            200
        ).json({

            success:
                true,

            message:
                "Product deleted"

        });

    }
);


// ========================================
// USERS
// ========================================

app.get(
    "/api/users",
    (req, res) => {

        const users =
            readData(
                usersFile
            );


        return res.status(
            200
        ).json(
            users
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


        const newUser = {

            id:
                getNextId(
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
            newUser
        );


        const saved =
            writeData(
                usersFile,
                users
            );


        if (!saved) {

            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not save user"

            });

        }


        return res.status(
            201
        ).json({

            success:
                true,

            message:
                "User added successfully",

            user:
                newUser

        });

    }
);


// ========================================
// MESSAGES
// ========================================

app.get(
    "/api/messages",
    (req, res) => {

        const messages =
            readData(
                messagesFile
            );


        return res.status(
            200
        ).json(
            messages
        );

    }
);


// ========================================
// ADD MESSAGE
// ========================================

app.post(
    "/api/messages",
    (req, res) => {

        try {

            const messages =
                readData(
                    messagesFile
                );


            // ==================================
            // CREATE MESSAGE
            // ==================================

            const newMessage = {

                id:
                    getNextId(
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


                // ==================================
                // EXACT INDIA DATE + TIME
                // ==================================

                date:

                    new Date().toLocaleString(
                        "en-IN",
                        {

                            timeZone:
                                "Asia/Kolkata",

                            day:
                                "2-digit",

                            month:
                                "2-digit",

                            year:
                                "numeric",

                            hour:
                                "2-digit",

                            minute:
                                "2-digit",

                            second:
                                "2-digit",

                            hour12:
                                true

                        }
                    )

            };


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !newMessage.sender
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Sender is required"

                });

            }


            if (
                !newMessage.receiver
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Receiver is required"

                });

            }


            if (
                !newMessage.message
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Message is required"

                });

            }


            // ==================================
            // SAVE MESSAGE
            // ==================================

            messages.push(
                newMessage
            );


            const saved =
                writeData(

                    messagesFile,

                    messages

                );


            if (!saved) {

                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not save message"

                });

            }


            // ==================================
            // SUCCESS
            // ==================================

            return res.status(
                201
            ).json({

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


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Message could not be saved"

            });

        }

    }
);


// ========================================
// TRANSACTIONS
// ========================================

app.get(
    "/api/transactions",
    (req, res) => {

        const transactions =
            readData(
                transactionsFile
            );


        return res.status(
            200
        ).json(
            transactions
        );

    }
);


// ========================================
// DIRECT TRANSACTION CREATION DISABLED
// ========================================

app.post(
    "/api/transactions",
    (req, res) => {

        return res.status(
            403
        ).json({

            success:
                false,

            message:
                "Direct transaction creation is disabled. Complete payment through Paytm."

        });

    }
);


// ========================================
// SERVER
// ========================================

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
