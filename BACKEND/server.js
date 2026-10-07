const express =
    require("express");

const cors =
    require("cors");

const fs =
    require("fs");

const path =
    require("path");

const crypto =
    require("crypto");

const Razorpay =
    require("razorpay");


const app =
    express();


// ==================================================
// PORT
// ==================================================

const PORT =
    process.env.PORT ||
    10000;


// ==================================================
// RAZORPAY KEYS
// ==================================================

const RAZORPAY_KEY_ID =
    process.env.RAZORPAY_KEY_ID ||
    "";

const RAZORPAY_KEY_SECRET =
    process.env.RAZORPAY_KEY_SECRET ||
    "";


const razorpay =
    RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET

        ? new Razorpay({
            key_id:
                RAZORPAY_KEY_ID,

            key_secret:
                RAZORPAY_KEY_SECRET
        })

        : null;


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(
    cors()
);

app.use(
    express.json()
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


// ==================================================
// FILE FUNCTIONS
// ==================================================

function readData(file) {

    try {

        if (
            !fs.existsSync(file)
        ) {

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


        if (
            !data.trim()
        ) {

            return [];

        }


        return JSON.parse(
            data
        );


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


// ==================================================
// HOME
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.status(
            200
        ).json({

            success:
                true,

            message:
                "EduHub Backend is running",

            port:
                PORT

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


        return res.status(
            200
        ).json(
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


            const name =
                String(
                    req.body.name ||
                    req.body.productName ||
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


            const seller =
                String(
                    req.body.seller ||
                    req.body.sellerName ||
                    ""
                ).trim();


            const sellerEmail =
                String(
                    req.body.sellerEmail ||
                    ""
                ).trim();


            if (!name) {

                return res.status(
                    400
                ).json({

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

                return res.status(
                    400
                ).json({

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

                return res.status(
                    400
                ).json({

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

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Selling price cannot be greater than market price"

                });

            }


            if (!seller) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Seller name is required"

                });

            }


            if (!sellerEmail) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Seller email is required"

                });

            }


            const newProduct = {

                id:

                    products.length > 0

                        ? Math.max(
                            ...products.map(
                                p =>
                                    Number(
                                        p.id
                                    ) || 0
                            )
                        ) + 1

                        : 1,


                productName:
                    name,


                name:
                    name,


                marketPrice:
                    marketPrice,


                sellingPrice:
                    sellingPrice,


                category:
                    category,


                sellerName:
                    seller,


                seller:
                    seller,


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


        } catch (error) {

            console.log(
                "Add product error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Product could not be added"

            });

        }

    }
);


// UPDATE PRODUCT

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


        } catch (error) {

            console.log(
                "Update error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Product could not be updated"

            });

        }

    }
);


// DELETE PRODUCT

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


        } catch (error) {

            console.log(
                "Delete error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Product could not be deleted"

            });

        }

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

        try {

            const users =
                readData(
                    usersFile
                );


            const newUser = {

                id:

                    users.length > 0

                        ? Math.max(
                            ...users.map(
                                u =>
                                    Number(
                                        u.id
                                    ) || 0
                            )
                        ) + 1

                        : 1,


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


        } catch (error) {

            console.log(
                "User error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "User could not be added"

            });

        }

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


        return res.status(
            200
        ).json(
            messages
        );

    }
);


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


            if (!sender) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Sender is required"

                });

            }


            if (!receiver) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Receiver is required"

                });

            }


            if (!message) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Message is required"

                });

            }


            const newMessage = {

                id:

                    messages.length > 0

                        ? Math.max(
                            ...messages.map(
                                m =>
                                    Number(
                                        m.id
                                    ) || 0
                            )
                        ) + 1

                        : 1,


                sender:
                    sender,


                receiver:
                    receiver,


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

                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not save message"

                });

            }


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


// ==================================================
// RAZORPAY
// ==================================================

// PUBLIC KEY

app.get(
    "/api/payment/key",
    (req, res) => {

        if (!RAZORPAY_KEY_ID) {

            return res.status(
                503
            ).json({

                success:
                    false,

                message:
                    "Razorpay key is not configured"

            });

        }


        return res.status(
            200
        ).json({

            success:
                true,

            key:
                RAZORPAY_KEY_ID

        });

    }
);


// ==================================================
// CREATE RAZORPAY ORDER
// ==================================================

app.post(
    "/api/payment/create-order",
    async (req, res) => {

        try {

            if (!razorpay) {

                return res.status(
                    503
                ).json({

                    success:
                        false,

                    message:
                        "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render."

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


            if (!productId) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Product ID is required"

                });

            }


            if (
                !buyerEmail ||
                !buyerEmail.includes("@")
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Valid buyer email is required"

                });

            }


            const products =
                readData(
                    productsFile
                );


            const product =
                products.find(
                    p =>
                        Number(
                            p.id
                        ) === productId
                );


            if (!product) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    message:
                        "Product not found"

                });

            }


            if (
                product.available === false ||
                product.status === "Sold"
            ) {

                return res.status(
                    409
                ).json({

                    success:
                        false,

                    message:
                        "This product is already sold"

                });

            }


            const amountRupees =
                Number(
                    product.sellingPrice
                );


            if (
                !Number.isFinite(
                    amountRupees
                ) ||
                amountRupees <= 0
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Invalid product price"

                });

            }


            const amountPaise =
                Math.round(
                    amountRupees *
                    100
                );


            const order =
                await razorpay.orders.create({

                    amount:
                        amountPaise,

                    currency:
                        "INR",

                    receipt:
                        `eduhub_${product.id}_${Date.now()}`,

                    notes: {

                        productId:
                            String(
                                product.id
                            ),

                        buyerEmail:
                            buyerEmail

                    }

                });


            return res.status(
                201
            ).json({

                success:
                    true,

                key:
                    RAZORPAY_KEY_ID,

                order: {

                    id:
                        order.id,

                    amount:
                        order.amount,

                    currency:
                        order.currency

                },

                product: {

                    id:
                        product.id,

                    name:
                        product.name ||
                        product.productName ||
                        "Product",

                    seller:
                        product.seller ||
                        product.sellerName ||
                        "Seller",

                    amount:
                        amountRupees

                }

            });


        } catch (error) {

            console.log(
                "Create order error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Could not create payment order"

            });

        }

    }
);


// ==================================================
// VERIFY PAYMENT
// ==================================================

app.post(
    "/api/payment/verify",
    async (req, res) => {

        try {

            if (!razorpay) {

                return res.status(
                    503
                ).json({

                    success:
                        false,

                    message:
                        "Razorpay is not configured"

                });

            }


            const orderId =
                String(
                    req.body.razorpay_order_id ||
                    ""
                ).trim();


            const paymentId =
                String(
                    req.body.razorpay_payment_id ||
                    ""
                ).trim();


            const signature =
                String(
                    req.body.razorpay_signature ||
                    ""
                ).trim();


            const productId =
                Number(
                    req.body.productId
                );


            const buyerEmail =
                String(
                    req.body.buyerEmail ||
                    ""
                ).trim();


            if (
                !orderId ||
                !paymentId ||
                !signature ||
                !productId ||
                !buyerEmail
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Incomplete payment verification data"

                });

            }


            // --------------------------------
            // VERIFY SIGNATURE
            // --------------------------------

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${orderId}|${paymentId}`
                    )
                    .digest(
                        "hex"
                    );


            const expectedBuffer =
                Buffer.from(
                    generatedSignature
                );


            const receivedBuffer =
                Buffer.from(
                    signature
                );


            if (
                expectedBuffer.length !==
                receivedBuffer.length ||
                !crypto.timingSafeEqual(
                    expectedBuffer,
                    receivedBuffer
                )
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Payment signature verification failed"

                });

            }


            // --------------------------------
            // FETCH ORDER
            // --------------------------------

            const order =
                await razorpay.orders.fetch(
                    orderId
                );


            // --------------------------------
            // FETCH PAYMENT
            // --------------------------------

            const payment =
                await razorpay.payments.fetch(
                    paymentId
                );


            // --------------------------------
            // CHECK ORDER/PAYMENT MATCH
            // --------------------------------

            if (
                payment.order_id !==
                orderId
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Payment does not belong to this order"

                });

            }


            if (
                payment.status !==
                "captured"
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Payment has not been captured"

                });

            }


            if (
                Number(
                    payment.amount
                ) !==
                Number(
                    order.amount
                )
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Payment amount does not match order"

                });

            }


            // --------------------------------
            // FIND PRODUCT
            // --------------------------------

            const products =
                readData(
                    productsFile
                );


            const product =
                products.find(
                    p =>
                        Number(
                            p.id
                        ) === productId
                );


            if (!product) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    message:
                        "Product not found"

                });

            }


            if (
                product.available === false ||
                product.status === "Sold"
            ) {

                return res.status(
                    409
                ).json({

                    success:
                        false,

                    message:
                        "This product is already sold"

                });

            }


            // --------------------------------
            // VERIFY ORDER NOTES
            // --------------------------------

            if (
                order.notes &&
                order.notes.productId &&
                String(
                    order.notes.productId
                ) !==
                String(productId)
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        "Product and payment order do not match"

                });

            }


            // --------------------------------
            // TRANSACTIONS
            // --------------------------------

            const transactions =
                readData(
                    transactionsFile
                );


            // Prevent duplicate transaction
            const existing =
                transactions.find(
                    transaction =>
                        transaction.paymentId ===
                        paymentId
                );


            if (existing) {

                return res.status(
                    200
                ).json({

                    success:
                        true,

                    message:
                        "Payment already recorded",

                    transaction:
                        existing

                });

            }


            // --------------------------------
            // CREATE TRANSACTION
            // --------------------------------

            const newTransaction = {

                id:

                    transactions.length > 0

                        ? Math.max(
                            ...transactions.map(
                                t =>
                                    Number(
                                        t.id
                                    ) || 0
                            )
                        ) + 1

                        : 1,


                productId:
                    product.id,


                productName:
                    product.name ||
                    product.productName ||
                    "Unknown Product",


                amount:
                    Number(
                        payment.amount
                    ) / 100,


                buyer:
                    buyerEmail,


                seller:
                    product.seller ||
                    product.sellerName ||
                    "",


                sellerEmail:
                    product.sellerEmail ||
                    "",


                paymentMethod:
                    payment.method ||
                    "UPI",


                paymentId:
                    payment.id,


                orderId:
                    orderId,


                paymentStatus:
                    "Paid",


                status:
                    "Completed",


                date:
                    new Date().toISOString()

            };


            // --------------------------------
            // MARK PRODUCT SOLD
            // --------------------------------

            const updatedProducts =
                products.map(
                    p => {

                        if (
                            Number(
                                p.id
                            ) ===
                            productId
                        ) {

                            return {

                                ...p,

                                available:
                                    false,

                                status:
                                    "Sold"

                            };

                        }


                        return p;

                    }
                );


            // --------------------------------
            // SAVE PRODUCT
            // --------------------------------

            const productsSaved =
                writeData(
                    productsFile,
                    updatedProducts
                );


            if (!productsSaved) {

                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not update product"

                });

            }


            // --------------------------------
            // SAVE TRANSACTION
            // --------------------------------

            const transactionsSaved =
                writeData(
                    transactionsFile,
                    [
                        ...transactions,
                        newTransaction
                    ]
                );


            if (!transactionsSaved) {

                // Restore product
                writeData(
                    productsFile,
                    products
                );


                return res.status(
                    500
                ).json({

                    success:
                        false,

                    message:
                        "Could not save transaction"

                });

            }


            // --------------------------------
            // SUCCESS
            // --------------------------------

            console.log(
                "Verified payment:",
                newTransaction
            );


            return res.status(
                201
            ).json({

                success:
                    true,

                message:
                    "Payment verified successfully",

                transaction:
                    newTransaction

            });


        } catch (error) {

            console.log(
                "Verify payment error:",
                error.message
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Payment verification failed"

            });

        }

    }
);


// ==================================================
// GET TRANSACTIONS
// ==================================================

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


// ==================================================
// SERVER
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
            "Products: /api/products"
        );

        console.log(
            "Messages: /api/messages"
        );

        console.log(
            "Transactions: /api/transactions"
        );

        console.log(
            "Razorpay:",
            razorpay
                ? "Configured"
                : "NOT CONFIGURED"
        );

        console.log(
            "======================================"
        );

        console.log("");

    }
);

