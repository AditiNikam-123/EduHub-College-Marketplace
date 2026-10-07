const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const PaytmChecksum = require("paytmchecksum");

const app = express();

// ==================================================
// PORT
// ==================================================

const PORT = process.env.PORT || 10000;


// ==================================================
// FRONTEND / BACKEND URL
// ==================================================

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eduhub-college-marketplace.onrender.com";

const BACKEND_URL =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://eduhub-backend-llwi.onrender.com";


// ==================================================
// MONGODB CONFIG
// ==================================================

const MONGODB_URI =
    process.env.MONGODB_URI || "";

const DB_NAME =
    process.env.DB_NAME ||
    "eduhub";

let mongoClient = null;
let db = null;


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
// OLD JSON FILES
// Used ONLY for first-time migration
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


// ==================================================
// JSON READ HELPER
// ==================================================

function readOldJson(file) {

    try {

        if (
            !fs.existsSync(file)
        ) {

            return [];
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

        console.log(
            "Old JSON read error:",
            error.message
        );

        return [];
    }
}


// ==================================================
// MONGODB CONNECT
// ==================================================

async function connectMongoDB() {

    if (db) {

        return db;
    }

    if (!MONGODB_URI) {

        throw new Error(
            "MONGODB_URI is missing. Add it in Render Environment Variables."
        );
    }

    mongoClient =
        new MongoClient(
            MONGODB_URI
        );

    await mongoClient.connect();

    db =
        mongoClient.db(
            DB_NAME
        );

    await db
        .command({
            ping: 1
        });

    console.log(
        "✅ MongoDB connected successfully."
    );

    return db;
}


// ==================================================
// ONE-TIME MIGRATION
// ==================================================

async function migrateOldJsonData() {

    const database =
        await connectMongoDB();

    const migrationList = [

        {
            collection:
                "products",

            file:
                productsFile
        },

        {
            collection:
                "users",

            file:
                usersFile
        },

        {
            collection:
                "messages",

            file:
                messagesFile
        },

        {
            collection:
                "transactions",

            file:
                transactionsFile
        }
    ];


    for (
        const item
        of migrationList
    ) {

        try {

            const collection =
                database.collection(
                    item.collection
                );

            const count =
                await collection.countDocuments();

            // Only migrate if collection is empty
            if (
                count === 0
            ) {

                const oldData =
                    readOldJson(
                        item.file
                    );

                if (
                    oldData.length > 0
                ) {

                    await collection.insertMany(
                        oldData,
                        {
                            ordered: false
                        }
                    );

                    console.log(
                        `✅ Migrated ${oldData.length} ${item.collection} records to MongoDB.`
                    );
                }
            }

        } catch (error) {

            console.log(
                `Migration error for ${item.collection}:`,
                error.message
            );
        }
    }
}


// ==================================================
// PAYTM ORDER COLLECTION
// ==================================================

function paytmOrdersCollection() {

    return db.collection(
        "paytm_orders"
    );
}


// ==================================================
// GENERATE NEW NUMERIC ID
// ==================================================

async function nextId(
    collectionName
) {

    const collection =
        db.collection(
            collectionName
        );

    const last =
        await collection
            .find({})
            .sort({
                id: -1
            })
            .limit(1)
            .next();

    if (!last) {

        return 1;
    }

    return (
        Number(
            last.id
        ) || 0
    ) + 1;
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
        String(
            email
        )
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


// ==================================================
// HOME
// ==================================================

app.get(
    "/",
    async (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "EduHub Backend is running",

            database:
                db
                    ? "MongoDB connected"
                    : "MongoDB not connected",

            paymentGateway:
                "Paytm"
        });
    }
);


// ==================================================
// DATABASE STATUS
// ==================================================

app.get(
    "/api/database-status",
    async (
        req,
        res
    ) => {

        try {

            await connectMongoDB();

            return res.json({

                success:
                    true,

                database:
                    DB_NAME,

                status:
                    "Connected"
            });

        } catch (error) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    status:
                        "Not connected",

                    message:
                        error.message
                });
        }
    }
);


// ==================================================
// PRODUCTS - GET
// ==================================================

app.get(
    "/api/products",
    async (
        req,
        res
    ) => {

        try {

            const products =
                await db
                    .collection(
                        "products"
                    )
                    .find({})
                    .sort({
                        id: 1
                    })
                    .toArray();

            return res.json(
                products
            );

        } catch (error) {

            console.error(
                "Get products error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not load products."
                });
        }
    }
);


// ==================================================
// PRODUCTS - ADD
// ==================================================

app.post(
    "/api/products",
    async (
        req,
        res
    ) => {

        try {

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


            if (!productName) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Product name is required."
                    });
            }


            if (!sellerName) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

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

                        success:
                            false,

                        message:
                            "Valid seller email is required."
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

                        success:
                            false,

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

                        success:
                            false,

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

                        success:
                            false,

                        message:
                            "Selling price cannot be greater than market price."
                    });
            }


            const id =
                await nextId(
                    "products"
                );


            const product = {

                id,

                productName:

                    productName,

                name:

                    productName,

                marketPrice,

                sellingPrice,

                category,

                sellerName,

                seller:
                    sellerName,

                sellerEmail,

                sellerPaytmMid,

                available:
                    true,

                status:
                    "Available",

                date:
                    new Date().toISOString()
            };


            await db
                .collection(
                    "products"
                )
                .insertOne(
                    product
                );


            return res
                .status(201)
                .json({

                    success:
                        true,

                    message:
                        "Product listed successfully.",

                    product
                });

        } catch (error) {

            console.error(
                "Add product error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not save product."
                });
        }
    }
);


// ==================================================
// PRODUCTS - UPDATE
// ==================================================

app.put(
    "/api/products/:id",
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const result =
                await db
                    .collection(
                        "products"
                    )
                    .updateOne(
                        {
                            id
                        },
                        {
                            $set:
                                req.body
                        }
                    );


            if (
                result.matchedCount ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Product not found."
                    });
            }


            const product =
                await db
                    .collection(
                        "products"
                    )
                    .findOne({
                        id
                    });


            return res.json({

                success:
                    true,

                product
            });

        } catch (error) {

            console.error(
                "Update product error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not update product."
                });
        }
    }
);


// ==================================================
// PRODUCTS - DELETE
// ==================================================

app.delete(
    "/api/products/:id",
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const result =
                await db
                    .collection(
                        "products"
                    )
                    .deleteOne({
                        id
                    });


            if (
                result.deletedCount ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Product not found."
                    });
            }


            return res.json({

                success:
                    true,

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

                    success:
                        false,

                    message:
                        "Could not delete product."
                });
        }
    }
);


// ==================================================
// USERS - GET
// ==================================================

app.get(
    "/api/users",
    async (
        req,
        res
    ) => {

        try {

            const users =
                await db
                    .collection(
                        "users"
                    )
                    .find({})
                    .sort({
                        id: 1
                    })
                    .toArray();

            return res.json(
                users
            );

        } catch (error) {

            console.error(
                "Get users error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not load users."
                });
        }
    }
);


// ==================================================
// USERS - ADD
// ==================================================

app.post(
    "/api/users",
    async (
        req,
        res
    ) => {

        try {

            const name =
                String(
                    req.body.name ||
                    ""
                ).trim();

            const email =
                String(
                    req.body.email ||
                    ""
                ).trim();

            const password =
                String(
                    req.body.password ||
                    ""
                );


            if (!name || !email) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Name and email are required."
                    });
            }


            const existing =
                await db
                    .collection(
                        "users"
                    )
                    .findOne({
                        email
                    });


            if (existing) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            "User with this email already exists."
                    });
            }


            const id =
                await nextId(
                    "users"
                );


            const user = {

                id,

                name,

                email,

                password,

                date:
                    new Date().toISOString()
            };


            await db
                .collection(
                    "users"
                )
                .insertOne(
                    user
                );


            return res
                .status(201)
                .json({

                    success:
                        true,

                    message:
                        "User added successfully.",

                    user
                });

        } catch (error) {

            console.error(
                "Add user error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not save user."
                });
        }
    }
);


// ==================================================
// MESSAGES - GET
// ==================================================

app.get(
    "/api/messages",
    async (
        req,
        res
    ) => {

        try {

            const messages =
                await db
                    .collection(
                        "messages"
                    )
                    .find({})
                    .sort({
                        id: -1
                    })
                    .toArray();

            return res.json(
                messages
            );

        } catch (error) {

            console.error(
                "Get messages error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not load messages."
                });
        }
    }
);


// ==================================================
// MESSAGES - ADD
// ==================================================

app.post(
    "/api/messages",
    async (
        req,
        res
    ) => {

        try {

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

            const messageText =
                String(
                    req.body.message ||
                    ""
                ).trim();


            if (
                !sender ||
                !receiver ||
                !messageText
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Sender, receiver and message are required."
                    });
            }


            const id =
                await nextId(
                    "messages"
                );


            const message = {

                id,

                sender,

                receiver,

                productId:
                    req.body.productId ||
                    null,

                productName:
                    req.body.productName ||
                    req.body.product ||
                    "",

                product:
                    req.body.product ||
                    req.body.productName ||
                    "",

                message:
                    messageText,

                replyTo:
                    req.body.replyTo ||
                    null,

                date:
                    new Date().toLocaleString(
                        "en-IN"
                    )
            };


            await db
                .collection(
                    "messages"
                )
                .insertOne(
                    message
                );


            return res
                .status(201)
                .json({

                    success:
                        true,

                    message:
                        "Message sent successfully.",

                    data:
                        message
                });

        } catch (error) {

            console.error(
                "Add message error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not save message."
                });
        }
    }
);


// ==================================================
// TRANSACTIONS - GET
// ==================================================

app.get(
    "/api/transactions",
    async (
        req,
        res
    ) => {

        try {

            const transactions =
                await db
                    .collection(
                        "transactions"
                    )
                    .find({})
                    .sort({
                        id: -1
                    })
                    .toArray();

            return res.json(
                transactions
            );

        } catch (error) {

            console.error(
                "Get transactions error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not load transactions."
                });
        }
    }
);


// ==================================================
// DIRECT TRANSACTION CREATION DISABLED
// ==================================================

app.post(
    "/api/transactions",
    async (
        req,
        res
    ) => {

        return res
            .status(403)
            .json({

                success:
                    false,

                message:
                    "Transactions are created only after successful payment verification."
            });
    }
);


// ==================================================
// PAYTM CREATE PAYMENT
// ==================================================

app.post(
    "/api/paytm/create-payment",
    async (
        req,
        res
    ) => {

        try {

            if (
                !paytmConfigured()
            ) {

                return res
                    .status(503)
                    .json({

                        success:
                            false,

                        message:
                            "Paytm is not configured yet."
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

                        success:
                            false,

                        message:
                            "Invalid product ID."
                    });
            }


            if (
                !buyerEmail ||
                !buyerEmail.includes("@")
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

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

                        success:
                            false,

                        message:
                            "Enter a valid 10-digit mobile number."
                    });
            }


            const product =
                await db
                    .collection(
                        "products"
                    )
                    .findOne({
                        id:
                            productId
                    });


            if (!product) {

                return res
                    .status(404)
                    .json({

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

                return res
                    .status(409)
                    .json({

                        success:
                            false,

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

                        success:
                            false,

                        message:
                            "Seller does not have a Paytm Child MID configured."
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
                amount <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid product price."
                    });
            }


            const orderId =
                createOrderId();


            // ==============================================
            // PAYTM CREATE LINK
            // ==============================================

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
                            product.productName ||
                            "Product"
                        )
                    ).slice(
                        0,
                        64
                    ),

                linkDescription:
                    "EduHub College Marketplace Payment",

                linkType:
                    "FIXED",

                amount:
                    amount.toFixed(
                        2
                    ),

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

                splitSettlementInfo: {

                    splitMethod:
                        "PERCENTAGE",

                    splitInfo: [

                        {

                            mid:
                                sellerPaytmMid,

                            percentage:
                                "100"
                        }
                    ]
                },

                redirectionUrlSuccess:
                    `${FRONTEND_URL}?paytm_status=TXN_SUCCESS&orderId=${encodeURIComponent(
                        orderId
                    )}`,

                redirectionUrlFailure:
                    `${FRONTEND_URL}?paytm_status=TXN_FAILURE&orderId=${encodeURIComponent(
                        orderId
                    )}`
            };


            const signature =
                await PaytmChecksum.generateSignature(
                    JSON.stringify(
                        requestBody
                    ),
                    PAYTM_MERCHANT_KEY
                );


            const payload = {

                head: {

                    tokenType:
                        "AES",

                    signature
                },

                body:
                    requestBody
            };


            const paytmResponse =
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
                                payload
                            )
                    }
                );


            const responseData =
                await paytmResponse.json();


            console.log(
                "Paytm response:",
                responseData
            );


            const resultInfo =
                responseData &&
                responseData.body &&
                responseData.body.resultInfo
                    ? responseData.body.resultInfo
                    : {};


            if (
                !paytmResponse.ok ||
                resultInfo.resultStatus !==
                    "SUCCESS"
            ) {

                return res
                    .status(502)
                    .json({

                        success:
                            false,

                        message:
                            resultInfo.resultMessage ||
                            "Paytm payment link could not be created."
                    });
            }


            const paymentUrl =
                responseData.body &&
                responseData.body.shortUrl;


            if (
                !paymentUrl
            ) {

                return res
                    .status(502)
                    .json({

                        success:
                            false,

                        message:
                            "Paytm payment URL was not returned."
                    });
            }


            // ==============================================
            // SAVE PAYMENT ORDER IN MONGODB
            // ==============================================

            await paytmOrdersCollection()
                .insertOne({

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

                    splitSettlement:
                        true,

                    splitPercentage:
                        100,

                    paymentStatus:
                        "PENDING",

                    createdAt:
                        new Date().toISOString()
                });


            return res.json({

                success:
                    true,

                orderId,

                paymentUrl
            });

        } catch (error) {

            console.error(
                "Paytm create payment error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        error.message ||
                        "Could not create payment."
                });
        }
    }
);


// ==================================================
// PAYTM CALLBACK
// ==================================================

app.post(
    "/paytm/callback",
    async (
        req,
        res
    ) => {

        try {

            if (
                !PAYTM_MERCHANT_KEY
            ) {

                return res
                    .status(503)
                    .send(
                        "Paytm is not configured."
                    );
            }


            const data = {
                ...req.body
            };


            const checksum =
                data.CHECKSUMHASH;


            delete data.CHECKSUMHASH;


            if (!checksum) {

                return res
                    .status(400)
                    .send(
                        "Checksum missing."
                    );
            }


            const valid =
                await PaytmChecksum.verifySignature(
                    data,
                    PAYTM_MERCHANT_KEY,
                    checksum
                );


            if (!valid) {

                return res
                    .status(400)
                    .send(
                        "Invalid checksum."
                    );
            }


            const orderId =
                String(
                    data.ORDERID ||
                    ""
                ).trim();

            const status =
                String(
                    data.STATUS ||
                    ""
                ).trim();


            if (!orderId) {

                return res
                    .status(400)
                    .send(
                        "Order ID missing."
                    );
            }


            const paytmOrder =
                await paytmOrdersCollection()
                    .findOne({
                        orderId
                    });


            if (!paytmOrder) {

                return res
                    .status(404)
                    .send(
                        "Order not found."
                    );
            }


            // ==============================================
            // PAYMENT FAILED / PENDING
            // ==============================================

            if (
                status !==
                "TXN_SUCCESS"
            ) {

                await paytmOrdersCollection()
                    .updateOne(
                        {
                            orderId
                        },
                        {
                            $set: {

                                paymentStatus:
                                    status ||
                                    "PENDING",

                                paytmTxnId:
                                    data.TXNID ||
                                    "",

                                updatedAt:
                                    new Date().toISOString()
                            }
                        }
                    );


                return res
                    .status(200)
                    .send(
                        "Payment status received."
                    );
            }


            // ==============================================
            // VERIFY AMOUNT
            // ==============================================

            const paidAmount =
                Number(
                    data.TXNAMOUNT
                );

            const expectedAmount =
                Number(
                    paytmOrder.amount
                );


            if (
                Math.abs(
                    paidAmount -
                    expectedAmount
                ) > 0.001
            ) {

                return res
                    .status(400)
                    .send(
                        "Amount mismatch."
                    );
            }


            // ==============================================
            // CHECK IF TRANSACTION ALREADY EXISTS
            // ==============================================

            const existingTransaction =
                await db
                    .collection(
                        "transactions"
                    )
                    .findOne({

                        paytmOrderId:
                            orderId
                    });


            if (
                existingTransaction
            ) {

                return res
                    .status(200)
                    .send(
                        "Payment already processed."
                    );
            }


            // ==============================================
            // MARK PRODUCT SOLD
            // ==============================================

            const productResult =
                await db
                    .collection(
                        "products"
                    )
                    .findOneAndUpdate(
                        {
                            id:
                                Number(
                                    paytmOrder.productId
                                ),

                            available:
                                true
                        },
                        {
                            $set: {

                                available:
                                    false,

                                status:
                                    "Sold"
                            }
                        },
                        {
                            returnDocument:
                                "after"
                        }
                    );


            if (
                !productResult.value
            ) {

                return res
                    .status(409)
                    .send(
                        "Product is already sold or unavailable."
                    );
            }


            // ==============================================
            // CREATE TRANSACTION
            // ==============================================

            const transactionId =
                await nextId(
                    "transactions"
                );


            const transaction = {

                id:
                    transactionId,

                productName:
                    paytmOrder.productName,

                productId:
                    paytmOrder.productId,

                amount:
                    paytmOrder.amount,

                buyer:
                    paytmOrder.buyerEmail,

                buyerMobile:
                    paytmOrder.buyerMobile,

                seller:
                    paytmOrder.seller,

                sellerEmail:
                    paytmOrder.sellerEmail,

                sellerPaytmMid:
                    paytmOrder.sellerPaytmMid,

                paymentGateway:
                    "Paytm",

                splitSettlement:
                    true,

                sellerSettlementPercentage:
                    100,

                paymentStatus:
                    "TXN_SUCCESS",

                status:
                    "Completed",

                paytmOrderId:
                    orderId,

                paytmTxnId:
                    data.TXNID ||
                    "",

                bankTxnId:
                    data.BANKTXNID ||
                    "",

                paymentMode:
                    data.PAYMENTMODE ||
                    "",

                date:
                    new Date().toISOString()
            };


            await db
                .collection(
                    "transactions"
                )
                .insertOne(
                    transaction
                );


            // ==============================================
            // UPDATE PAYTM ORDER
            // ==============================================

            await paytmOrdersCollection()
                .updateOne(
                    {
                        orderId
                    },
                    {
                        $set: {

                            paymentStatus:
                                "TXN_SUCCESS",

                            status:
                                "Completed",

                            paytmTxnId:
                                data.TXNID ||
                                "",

                            completedAt:
                                new Date().toISOString()
                        }
                    }
                );


            // ==============================================
            // REDIRECT USER BACK TO WEBSITE
            // ==============================================

            const redirectUrl =
                new URL(
                    FRONTEND_URL
                );


            redirectUrl.searchParams.set(
                "paytm_status",
                "TXN_SUCCESS"
            );


            redirectUrl.searchParams.set(
                "orderId",
                orderId
            );


            return res.redirect(
                303,
                redirectUrl.toString()
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
);


// ==================================================
// PAYTM GET CALLBACK
// ==================================================

app.get(
    "/paytm/callback",
    async (
        req,
        res
    ) => {

        try {

            return res
                .status(200)
                .send(
                    "EduHub Paytm callback endpoint is active."
                );

        } catch (error) {

            return res
                .status(500)
                .send(
                    "Callback error."
                );
        }
    }
);


// ==================================================
// PAYTM ORDER STATUS
// ==================================================

app.get(
    "/api/paytm/order/:orderId",
    async (
        req,
        res
    ) => {

        try {

            const order =
                await paytmOrdersCollection()
                    .findOne({

                        orderId:
                            req.params.orderId
                    });


            if (!order) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Payment order not found."
                    });
            }


            return res.json({

                success:
                    true,

                order
            });

        } catch (error) {

            console.error(
                "Paytm status error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Could not load payment status."
                });
        }
    }
);


// ==================================================
// START SERVER ONLY AFTER MONGODB CONNECTS
// ==================================================

async function startServer() {

    try {

        await connectMongoDB();

        await migrateOldJsonData();


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
                    "Database:",
                    DB_NAME
                );

                console.log(
                    "MongoDB:",
                    "Connected"
                );

                console.log(
                    "Paytm:",
                    paytmConfigured()
                        ? "Configured"
                        : "Waiting for credentials"
                );

                console.log(
                    "========================================"
                );
            }
        );

    } catch (error) {

        console.error(
            "❌ Server startup failed:"
        );

        console.error(
            error
        );

        process.exit(
            1
        );
    }
}


startServer();
