// ==========================================================
// EDUHUB COLLEGE MARKETPLACE - BACKEND
// MongoDB + Express + Paytm
// ==========================================================

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const PaytmChecksum = require("paytmchecksum");

const app = express();


// ==========================================================
// PORT
// ==========================================================

const PORT =
    process.env.PORT || 10000;


// ==========================================================
// MONGODB CONFIG
// ==========================================================

const MONGODB_URI =
    process.env.MONGODB_URI || "";

const DB_NAME =
    process.env.DB_NAME || "eduhub";

let mongoClient = null;
let db = null;


// ==========================================================
// PAYTM CONFIG
// ==========================================================

const PAYTM_ENVIRONMENT =
    process.env.PAYTM_ENVIRONMENT ||
    "staging";


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
    process.env.BACKEND_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://eduhub-backend-llwi.onrender.com";


const PAYTM_CALLBACK_URL =
    process.env.PAYTM_CALLBACK_URL ||
    `${BACKEND_PUBLIC_URL}/paytm/callback`;


// ==========================================================
// MIDDLEWARE
// ==========================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: false
    })
);


// ==========================================================
// HELPER
// ==========================================================

function getNextIdFromArray(items) {

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


async function getNextProductId() {

    const lastProduct =
        await db
            .collection("products")
            .find({})
            .sort({
                id: -1
            })
            .limit(1)
            .next();

    return (
        lastProduct
            ? Number(lastProduct.id) + 1
            : 1
    );
}


async function getNextUserId() {

    const lastUser =
        await db
            .collection("users")
            .find({})
            .sort({
                id: -1
            })
            .limit(1)
            .next();

    return (
        lastUser
            ? Number(lastUser.id) + 1
            : 1
    );
}


async function getNextMessageId() {

    const lastMessage =
        await db
            .collection("messages")
            .find({})
            .sort({
                id: -1
            })
            .limit(1)
            .next();

    return (
        lastMessage
            ? Number(lastMessage.id) + 1
            : 1
    );
}


async function getNextTransactionId() {

    const lastTransaction =
        await db
            .collection("transactions")
            .find({})
            .sort({
                id: -1
            })
            .limit(1)
            .next();

    return (
        lastTransaction
            ? Number(lastTransaction.id) + 1
            : 1
    );
}


function paytmIsConfigured() {

    return Boolean(
        PAYTM_MID &&
        PAYTM_MERCHANT_KEY &&
        PAYTM_WEBSITE_NAME &&
        PAYTM_PG_DOMAIN
    );
}


function formatAmount(value) {

    return Number(value).toFixed(2);
}


function createOrderId() {

    return (
        "EDUHUB_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );
}


function customerIdFromEmail(email) {

    return (
        String(email)
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(0, 30) ||
        "EDUHUBUSER"
    );
}


// ==========================================================
// MONGODB CONNECTION
// ==========================================================

async function connectMongoDB() {

    if (!MONGODB_URI) {

        throw new Error(
            "MONGODB_URI is missing in Render Environment Variables."
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
        "✅ MongoDB connected successfully"
    );

    console.log(
        "📦 Database:",
        DB_NAME
    );
}


// ==========================================================
// INDEXES
// ==========================================================

async function createIndexes() {

    await db
        .collection("products")
        .createIndex({
            id: 1
        });


    await db
        .collection("users")
        .createIndex(
            {
                email: 1
            },
            {
                unique: true,
                sparse: true
            }
        );


    await db
        .collection("messages")
        .createIndex({
            id: 1
        });


    await db
        .collection("transactions")
        .createIndex({
            id: 1
        });


    await db
        .collection("paytm_orders")
        .createIndex({
            orderId: 1
        });

}


// ==========================================================
// OPTIONAL MIGRATION FROM JSON FILES
// ==========================================================
// This is only for old data already present in the project.
// New data will be stored in MongoDB.
// ==========================================================

const fs = require("fs");
const path = require("path");


function readOldJSON(fileName) {

    try {

        const filePath =
            path.join(
                __dirname,
                fileName
            );


        if (!fs.existsSync(filePath)) {
            return [];
        }


        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );


        if (!content.trim()) {
            return [];
        }


        const data =
            JSON.parse(
                content
            );


        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        console.log(
            `⚠️ Could not read ${fileName}:`,
            error.message
        );

        return [];
    }
}


async function migrateOldJSONData() {

    // ------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------

    const productCount =
        await db
            .collection("products")
            .countDocuments();


    if (productCount === 0) {

        const oldProducts =
            readOldJSON(
                "products.json"
            );


        if (
            Array.isArray(oldProducts) &&
            oldProducts.length > 0
        ) {

            await db
                .collection("products")
                .insertMany(
                    oldProducts
                        .map(product => ({

                            id:
                                Number(
                                    product.id
                                ),

                            productName:
                                product.productName ||
                                product.name ||
                                "",

                            name:
                                product.name ||
                                product.productName ||
                                "",

                            marketPrice:
                                Number(
                                    product.marketPrice
                                ) || 0,

                            sellingPrice:
                                Number(
                                    product.sellingPrice
                                ) || 0,

                            category:
                                product.category ||
                                "Other",

                            sellerName:
                                product.sellerName ||
                                product.seller ||
                                "",

                            seller:
                                product.seller ||
                                product.sellerName ||
                                "",

                            sellerEmail:
                                product.sellerEmail ||
                                "",

                            sellerPaytmMid:
                                product.sellerPaytmMid ||
                                "",

                            status:
                                product.status ||
                                "Available",

                            available:
                                product.available !== false,

                            date:
                                product.date ||
                                new Date().toISOString()

                        }))
                );


            console.log(
                "✅ Old products migrated to MongoDB"
            );
        }
    }


    // ------------------------------------------------------
    // USERS
    // ------------------------------------------------------

    const userCount =
        await db
            .collection("users")
            .countDocuments();


    if (userCount === 0) {

        const oldUsers =
            readOldJSON(
                "users.json"
            );


        if (
            Array.isArray(oldUsers) &&
            oldUsers.length > 0
        ) {

            await db
                .collection("users")
                .insertMany(
                    oldUsers.map(user => ({

                        id:
                            Number(
                                user.id
                            ) || 0,

                        name:
                            user.name ||
                            "",

                        email:
                            String(
                                user.email ||
                                ""
                            )
                            .toLowerCase(),

                        password:
                            user.password ||
                            "",

                        createdAt:
                            user.createdAt ||
                            new Date().toISOString()

                    }))
                );


            console.log(
                "✅ Old users migrated to MongoDB"
            );
        }
    }


    // ------------------------------------------------------
    // MESSAGES
    // ------------------------------------------------------

    const messageCount =
        await db
            .collection("messages")
            .countDocuments();


    if (messageCount === 0) {

        const oldMessages =
            readOldJSON(
                "messages.json"
            );


        if (
            Array.isArray(oldMessages) &&
            oldMessages.length > 0
        ) {

            await db
                .collection("messages")
                .insertMany(
                    oldMessages.map(message => ({

                        id:
                            Number(
                                message.id
                            ) ||
                            Date.now(),

                        sender:
                            message.sender ||
                            "",

                        receiver:
                            message.receiver ||
                            "",

                        productId:
                            message.productId ||
                            null,

                        product:
                            message.product ||
                            message.productName ||
                            "Product",

                        productName:
                            message.productName ||
                            message.product ||
                            "Product",

                        message:
                            message.message ||
                            "",

                        replyTo:
                            message.replyTo ||
                            null,

                        date:
                            message.date ||
                            new Date().toLocaleString(
                                "en-IN"
                            )

                    }))
                );


            console.log(
                "✅ Old messages migrated to MongoDB"
            );
        }
    }


    // ------------------------------------------------------
    // TRANSACTIONS
    // ------------------------------------------------------

    const transactionCount =
        await db
            .collection("transactions")
            .countDocuments();


    if (transactionCount === 0) {

        const oldTransactions =
            readOldJSON(
                "transactions.json"
            );


        if (
            Array.isArray(oldTransactions) &&
            oldTransactions.length > 0
        ) {

            await db
                .collection("transactions")
                .insertMany(
                    oldTransactions.map(transaction => ({

                        id:
                            Number(
                                transaction.id
                            ) ||
                            Date.now(),

                        buyer:
                            transaction.buyer ||
                            "",

                        buyerMobile:
                            transaction.buyerMobile ||
                            "",

                        seller:
                            transaction.seller ||
                            "",

                        sellerEmail:
                            transaction.sellerEmail ||
                            "",

                        productId:
                            transaction.productId ||
                            null,

                        productName:
                            transaction.productName ||
                            "Product",

                        amount:
                            Number(
                                transaction.amount
                            ) || 0,

                        status:
                            transaction.status ||
                            "Completed",

                        paymentStatus:
                            transaction.paymentStatus ||
                            "Completed",

                        paymentGateway:
                            transaction.paymentGateway ||
                            "Legacy",

                        date:
                            transaction.date ||
                            new Date().toISOString()

                    }))
                );


            console.log(
                "✅ Old transactions migrated to MongoDB"
            );
        }
    }
}


// ==========================================================
// DATABASE STATUS
// ==========================================================

app.get(
    "/api/database-status",
    async (req, res) => {

        try {

            await db.command({
                ping: 1
            });


            return res.json({

                success: true,

                database:
                    DB_NAME,

                status:
                    "Connected"

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                database:
                    DB_NAME,

                status:
                    "Disconnected",

                message:
                    error.message

            });
        }
    }
);


// ==========================================================
// HOME
// ==========================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "🎓 EduHub Backend is running",

            database:
                DB_NAME,

            paymentGateway:
                "Paytm"

        });

    }
);


// ==========================================================
// PRODUCTS - GET ALL
// ==========================================================

app.get(
    "/api/products",
    async (req, res) => {

        try {

            const products =
                await db
                    .collection("products")
                    .find({})
                    .sort({
                        id: 1
                    })
                    .toArray();


            return res.status(200).json(
                products
            );

        } catch (error) {

            console.error(
                "Get products error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not load products."

            });
        }
    }
);


// ==========================================================
// PRODUCTS - ADD NEW
// ==========================================================

app.post(
    "/api/products",
    async (req, res) => {

        try {

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


            const sellerPaytmMid =
                String(
                    req.body.sellerPaytmMid ||
                    ""
                ).trim();


            // -----------------------------
            // VALIDATION
            // -----------------------------

            if (!productName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required."

                });
            }


            if (
                !Number.isFinite(
                    marketPrice
                ) ||
                marketPrice <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid market price is required."

                });
            }


            if (
                !Number.isFinite(
                    sellingPrice
                ) ||
                sellingPrice <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid selling price is required."

                });
            }


            if (!category) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category is required."

                });
            }


            if (!sellerName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Seller name is required."

                });
            }


            if (
                !sellerEmail ||
                !sellerEmail.includes("@")
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid seller email is required."

                });
            }


            // -----------------------------
            // NEW ID
            // -----------------------------

            const newId =
                await getNextProductId();


            const newProduct = {

                id:
                    newId,

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

                // OPTIONAL
                sellerPaytmMid:
                    sellerPaytmMid,

                status:
                    "Available",

                available:
                    true,

                date:
                    new Date().toISOString()

            };


            // -----------------------------
            // SAVE TO MONGODB
            // -----------------------------

            await db
                .collection("products")
                .insertOne(
                    newProduct
                );


            console.log(
                "✅ Product added:",
                newProduct
            );


            return res.status(201).json({

                success: true,

                message:
                    "Product added successfully.",

                product:
                    newProduct

            });

        } catch (error) {

            console.error(
                "Add product error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not save product to MongoDB."

            });
        }
    }
);


// ==========================================================
// PRODUCTS - UPDATE
// ==========================================================

app.put(
    "/api/products/:id",
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isFinite(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });
            }


            const updateData = {
                ...req.body
            };


            delete updateData._id;
            delete updateData.id;


            const result =
                await db
                    .collection("products")
                    .updateOne(
                        {
                            id: id
                        },
                        {
                            $set:
                                updateData
                        }
                    );


            if (
                result.matchedCount ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });
            }


            const updated =
                await db
                    .collection("products")
                    .findOne({
                        id: id
                    });


            return res.json({

                success: true,

                product:
                    updated

            });

        } catch (error) {

            console.error(
                "Update product error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not update product."

            });
        }
    }
);


// ==========================================================
// PRODUCTS - DELETE
// ==========================================================

app.delete(
    "/api/products/:id",
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            const result =
                await db
                    .collection("products")
                    .deleteOne({
                        id: id
                    });


            if (
                result.deletedCount ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });
            }


            return res.json({

                success: true,

                message:
                    "Product deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not delete product."

            });
        }
    }
);


// ==========================================================
// USERS - REGISTER
// ==========================================================

app.post(
    "/api/users",
    async (req, res) => {

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

                    success: false,

                    message:
                        "Name, email and password are required."

                });
            }


            const existingUser =
                await db
                    .collection("users")
                    .findOne({
                        email: email
                    });


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "User already exists."

                });
            }


            const id =
                await getNextUserId();


            const user = {

                id:
                    id,

                name:
                    name,

                email:
                    email,

                password:
                    password,

                createdAt:
                    new Date().toISOString()

            };


            await db
                .collection("users")
                .insertOne(
                    user
                );


            return res.status(201).json({

                success: true,

                message:
                    "Registration successful.",

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email

                }

            });

        } catch (error) {

            console.error(
                "Register error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Registration failed."

            });
        }
    }
);


// ==========================================================
// USERS - LOGIN
// ==========================================================

async function loginHandler(
    req,
    res
) {

    try {

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
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });
        }


        const user =
            await db
                .collection("users")
                .findOne({

                    email:
                        email,

                    password:
                        password

                });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });
        }


        return res.json({

            success: true,

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

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Login failed."

        });
    }
}


app.post(
    "/login",
    loginHandler
);


app.post(
    "/api/login",
    loginHandler
);


// ==========================================================
// MESSAGES - ADD
// ==========================================================

app.post(
    "/api/messages",
    async (req, res) => {

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


            const message =
                String(
                    req.body.message ||
                    ""
                ).trim();


            const productId =
                req.body.productId ||
                null;


            const productName =
                String(
                    req.body.productName ||
                    req.body.product ||
                    "Product"
                ).trim();


            const replyTo =
                req.body.replyTo ||
                null;


            if (
                !sender ||
                !receiver ||
                !message
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Sender, receiver and message are required."

                });
            }


            const id =
                await getNextMessageId();


            const newMessage = {

                id:
                    id,

                sender:
                    sender,

                receiver:
                    receiver,

                productId:
                    productId,

                product:
                    productName,

                productName:
                    productName,

                message:
                    message,

                replyTo:
                    replyTo,

                date:
                    new Date().toLocaleString(
                        "en-IN"
                    )

            };


            await db
                .collection("messages")
                .insertOne(
                    newMessage
                );


            return res.status(201).json({

                success: true,

                message:
                    "Message sent successfully.",

                data:
                    newMessage

            });

        } catch (error) {

            console.error(
                "Send message error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not send message."

            });
        }
    }
);


// ==========================================================
// MESSAGES - GET
// ==========================================================

app.get(
    "/api/messages",
    async (req, res) => {

        try {

            const email =
                String(
                    req.query.email ||
                    ""
                ).trim();


            let filter = {};


            if (email) {

                filter = {

                    $or: [

                        {
                            sender:
                                email
                        },

                        {
                            receiver:
                                email
                        }

                    ]

                };

            }


            const messages =
                await db
                    .collection("messages")
                    .find(filter)
                    .sort({
                        id: 1
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


            return res.status(500).json({

                success: false,

                message:
                    "Could not load messages."

            });
        }
    }
);


// ==========================================================
// TRANSACTIONS - GET
// ==========================================================

app.get(
    "/api/transactions",
    async (req, res) => {

        try {

            const email =
                String(
                    req.query.email ||
                    ""
                ).trim();


            let filter = {};


            if (email) {

                filter = {

                    $or: [

                        {
                            buyer:
                                email
                        },

                        {
                            sellerEmail:
                                email
                        }

                    ]

                };

            }


            const transactions =
                await db
                    .collection("transactions")
                    .find(filter)
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


            return res.status(500).json({

                success: false,

                message:
                    "Could not load transactions."

            });
        }
    }
);


// ==========================================================
// DIRECT TRANSACTION CREATION DISABLED
// ==========================================================

app.post(
    "/api/transactions",
    async (req, res) => {

        return res.status(410).json({

            success: false,

            message:
                "Direct transaction creation is disabled. Complete payment through Paytm."

        });

    }
);


// ==========================================================
// PAYTM API CALL
// ==========================================================

async function callPaytmAPI(
    endpoint,
    body
) {

    const signature =
        await PaytmChecksum.generateSignature(
            JSON.stringify(body),
            PAYTM_MERCHANT_KEY
        );


    const requestBody = {

        body:
            body,

        head: {

            signature:
                signature

        }

    };


    const response =
        await fetch(
            `${PAYTM_PG_DOMAIN}${endpoint}`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        requestBody
                    )

            }
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                text
            );

    } catch {

        throw new Error(
            "Invalid response from Paytm."
        );

    }


    if (!response.ok) {

        throw new Error(

            data?.body?.resultInfo?.resultMsg ||
            `Paytm returned HTTP ${response.status}.`

        );
    }


    return data;
}


// ==========================================================
// PAYTM VERIFY RESPONSE SIGNATURE
// ==========================================================

async function verifyPaytmResponse(
    response
) {

    const responseBody =
        response.body || {};


    const signature =
        response.head &&
        response.head.signature;


    if (!signature) {

        throw new Error(
            "Paytm response signature is missing."
        );
    }


    const valid =
        await PaytmChecksum.verifySignature(
            responseBody,
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


// ==========================================================
// PAYTM CREATE ORDER
// ==========================================================

app.post(
    "/api/paytm/create-order",
    async (req, res) => {

        try {

            if (
                !paytmIsConfigured()
            ) {

                return res.status(503).json({

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
                    req.body.buyer ||
                    ""
                )
                .trim()
                .toLowerCase();


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

                    success: false,

                    message:
                        "Valid buyer email is required."

                });
            }


            if (
                !/^\d{10}$/.test(
                    mobile
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid 10-digit mobile number is required."

                });
            }


            const product =
                await db
                    .collection("products")
                    .findOne({

                        id:
                            productId,

                        available:
                            true

                    });


            if (!product) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found or already sold."

                });
            }


            const amount =
                Number(
                    product.sellingPrice
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product has an invalid selling price."

                });
            }


            const orderId =
                createOrderId();


            const amountString =
                formatAmount(
                    amount
                );


            // ------------------------------------------
            // PAYTM REQUEST
            // ------------------------------------------

            const paytmBody = {

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


            // ------------------------------------------
            // OPTIONAL SPLIT SETTLEMENT
            // ------------------------------------------
            // Only added when seller has a valid
            // Paytm Child/Vendor MID.
            // ------------------------------------------

            const sellerChildMID =
                String(
                    product.sellerPaytmMid ||
                    ""
                ).trim();


            if (sellerChildMID) {

                paytmBody.splitSettlementInfo = {

                    splitMethod:
                        "PERCENTAGE",

                    splitInfo: [

                        {

                            mid:
                                sellerChildMID,

                            percentage:
                                "100"

                        }

                    ]

                };

            }


            // ------------------------------------------
            // CALL PAYTM
            // ------------------------------------------

            const paytmResponse =
                await callPaytmAPI(

                    `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(
                        PAYTM_MID
                    )}&orderId=${encodeURIComponent(
                        orderId
                    )}`,

                    paytmBody

                );


            const responseBody =
                await verifyPaytmResponse(
                    paytmResponse
                );


            const resultInfo =
                responseBody.resultInfo ||
                {};


            if (
                resultInfo.resultStatus &&
                resultInfo.resultStatus !==
                    "S"
            ) {

                return res.status(502).json({

                    success: false,

                    message:
                        resultInfo.resultMsg ||
                        "Paytm could not create the order."

                });
            }


            const txnToken =
                responseBody.txnToken;


            if (!txnToken) {

                return res.status(502).json({

                    success: false,

                    message:
                        "Paytm did not return a transaction token."

                });
            }


            // ------------------------------------------
            // SAVE ORDER IN MONGODB
            // ------------------------------------------

            const pendingOrder = {

                orderId:
                    orderId,

                productId:
                    product.id,

                productName:
                    product.name ||
                    product.productName ||
                    "Product",

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

                sellerPaytmMid:
                    sellerChildMID,

                status:
                    "Created",

                paymentStatus:
                    "PENDING",

                createdAt:
                    new Date().toISOString()

            };


            await db
                .collection("paytm_orders")
                .insertOne(
                    pendingOrder
                );


            return res.json({

                success: true,

                orderId:
                    orderId,

                txnToken:
                    txnToken,

                amount:
                    amountString,

                mid:
                    PAYTM_MID,

                checkoutJsUrl:
                    `${PAYTM_PG_DOMAIN}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(
                        PAYTM_MID
                    )}.js`

            });

        } catch (error) {

            console.error(
                "Paytm create order error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Could not create Paytm order."

            });
        }
    }
);


// ==========================================================
// PAYTM ORDER STATUS
// ==========================================================

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


    return await verifyPaytmResponse(
        response
    );
}


// ==========================================================
// PAYTM VERIFY + COMPLETE TRANSACTION
// ==========================================================

async function finalizePaytmOrder(
    orderId,
    statusBody
) {

    const pendingOrder =
        await db
            .collection("paytm_orders")
            .findOne({
                orderId:
                    orderId
            });


    if (!pendingOrder) {

        return {

            success: false,

            paymentStatus:
                "UNKNOWN",

            message:
                "Payment order not found."

        };

    }


    const resultInfo =
        statusBody.resultInfo ||
        {};


    const paymentStatus =
        resultInfo.resultStatus ||
        "";


    // ------------------------------------------------------
    // ALREADY COMPLETED
    // ------------------------------------------------------

    const existingTransaction =
        await db
            .collection("transactions")
            .findOne({

                paytmOrderId:
                    orderId

            });


    if (existingTransaction) {

        return {

            success: true,

            paymentStatus:
                "TXN_SUCCESS",

            transaction:
                existingTransaction

        };

    }


    // ------------------------------------------------------
    // PENDING
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // FAILURE
    // ------------------------------------------------------

    if (
        paymentStatus !==
        "TXN_SUCCESS"
    ) {

        await db
            .collection("paytm_orders")
            .updateOne(

                {
                    orderId:
                        orderId
                },

                {
                    $set: {

                        paymentStatus:
                            paymentStatus ||
                            "TXN_FAILURE",

                        status:
                            "Failed",

                        updatedAt:
                            new Date().toISOString()

                    }

                }

            );


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


    // ------------------------------------------------------
    // AMOUNT VERIFICATION
    // ------------------------------------------------------

    const returnedAmount =
        Number(
            statusBody.txnAmount
        );


    const expectedAmount =
        Number(
            pendingOrder.amount
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


    // ------------------------------------------------------
    // PRODUCT
    // ------------------------------------------------------

    const product =
        await db
            .collection("products")
            .findOne({
                id:
                    Number(
                        pendingOrder.productId
                    )
            });


    if (!product) {

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Product not found."

        };

    }


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


    // ------------------------------------------------------
    // CREATE TRANSACTION
    // ------------------------------------------------------

    const transactionId =
        await getNextTransactionId();


    const transaction = {

        id:
            transactionId,

        productName:
            product.name ||
            product.productName ||
            "Product",

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


    // ------------------------------------------------------
    // MARK PRODUCT SOLD
    // ------------------------------------------------------

    const updateResult =
        await db
            .collection("products")
            .updateOne(

                {
                    id:
                        product.id,

                    available:
                        true

                },

                {
                    $set: {

                        available:
                            false,

                        status:
                            "Sold",

                        soldAt:
                            new Date().toISOString()

                    },

                    $unset: {

                        reservedOrderId:
                            "",

                        reservedUntil:
                            ""

                    }

                }

            );


    if (
        updateResult.modifiedCount ===
        0
    ) {

        return {

            success: false,

            paymentStatus:
                "TXN_FAILURE",

            message:
                "Product could not be marked as sold."

        };

    }


    // ------------------------------------------------------
    // SAVE TRANSACTION
    // ------------------------------------------------------

    await db
        .collection("transactions")
        .insertOne(
            transaction
        );


    // ------------------------------------------------------
    // UPDATE PAYTM ORDER
    // ------------------------------------------------------

    await db
        .collection("paytm_orders")
        .updateOne(

            {
                orderId:
                    orderId
            },

            {
                $set: {

                    status:
                        "Completed",

                    paymentStatus:
                        "TXN_SUCCESS",

                    paytmTxnId:
                        statusBody.txnId ||
                        "",

                    completedAt:
                        new Date().toISOString()

                }

            }

        );


    console.log(
        "✅ Payment completed:",
        orderId
    );


    return {

        success: true,

        paymentStatus:
            "TXN_SUCCESS",

        transaction:
            transaction

    };

}


// ==========================================================
// PAYTM VERIFY ENDPOINT
// ==========================================================

app.post(
    "/api/paytm/verify",
    async (req, res) => {

        try {

            if (
                !paytmIsConfigured()
            ) {

                return res.status(503).json({

                    success: false,

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

                    success: false,

                    message:
                        "Order ID is required."

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
                    : (
                        result.paymentStatus ===
                        "PENDING"
                            ? 200
                            : 400
                    )
            ).json(
                result
            );

        } catch (error) {

            console.error(
                "Paytm verify error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Could not verify Paytm payment."

            });

        }
    }
);


// ==========================================================
// PAYTM CALLBACK
// ==========================================================

async function handlePaytmCallback(
    req,
    res
) {

    try {

        if (
            !paytmIsConfigured()
        ) {

            return res.status(503).send(
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

            return res.status(400).send(
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

            return res.status(400).send(
                "Payment verification failed."
            );
        }


        const orderId =
            String(
                callbackData.ORDERID ||
                ""
            ).trim();


        if (!orderId) {

            return res.status(400).send(
                "Order ID missing."
            );
        }


        const statusBody =
            await getPaytmOrderStatus(
                orderId
            );


        await finalizePaytmOrder(

            orderId,

            statusBody

        );


        return res.redirect(

            `${FRONTEND_URL}/index.html?orderId=${encodeURIComponent(
                orderId
            )}`

        );

    } catch (error) {

        console.error(
            "Paytm callback error:",
            error
        );


        return res.status(500).send(
            "Unable to verify payment."
        );
    }
}


app.get(
    "/paytm/callback",
    handlePaytmCallback
);


app.post(
    "/paytm/callback",
    handlePaytmCallback
);


// ==========================================================
// SERVER START
// ==========================================================

async function startServer() {

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "🎓 Starting EduHub Backend..."
        );


        // MongoDB
        await connectMongoDB();


        // Indexes
        await createIndexes();


        // Old JSON migration
        await migrateOldJSONData();


        // Start server
        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    "=========================================="
                );

                console.log(
                    "✅ EduHub Backend Started"
                );

                console.log(
                    `🌐 Port: ${PORT}`
                );

                console.log(
                    `📦 MongoDB: ${DB_NAME}`
                );

                console.log(
                    `🛍️ Products: /api/products`
                );

                console.log(
                    `💬 Messages: /api/messages`
                );

                console.log(
                    `🧾 Transactions: /api/transactions`
                );

                console.log(
                    `💳 Paytm configured: ${paytmIsConfigured()}`
                );

                console.log(
                    "=========================================="
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
