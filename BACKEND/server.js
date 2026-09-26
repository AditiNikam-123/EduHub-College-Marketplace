const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Render ke liye PORT automatically milega
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());

// ========================================
// DATA FILES
// ========================================

const productsFile = path.join(__dirname, "products.json");
const usersFile = path.join(__dirname, "users.json");
const messagesFile = path.join(__dirname, "messages.json");
const transactionsFile = path.join(__dirname, "transactions.json");

// ========================================
// FILE FUNCTIONS
// ========================================

function readData(file) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, "[]");
            return [];
        }

        const data = fs.readFileSync(file, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);
    } catch (error) {
        console.log("File read error:", file);
        console.log(error.message);
        return [];
    }
}

function writeData(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        );

        return true;
    } catch (error) {
        console.log("File write error:", error.message);
        return false;
    }
}

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "EduHub Backend is running",
        port: PORT
    });
});

// ========================================
// PRODUCTS
// ========================================

app.get("/api/products", (req, res) => {
    const products = readData(productsFile);

    res.status(200).json(products);
});

app.post("/api/products", (req, res) => {
    const products = readData(productsFile);

    const newProduct = {
        id:
            products.length > 0
                ? Math.max(
                    ...products.map(
                        p => Number(p.id) || 0
                    )
                ) + 1
                : 1,

        productName:
            req.body.productName ||
            req.body.name ||
            "",

        name:
            req.body.name ||
            req.body.productName ||
            "",

        marketPrice:
            Number(req.body.marketPrice) || 0,

        sellingPrice:
            Number(req.body.sellingPrice) || 0,

        category:
            req.body.category || "Other",

        sellerName:
            req.body.sellerName ||
            req.body.seller ||
            "",

        seller:
            req.body.seller ||
            req.body.sellerName ||
            "",

        sellerEmail:
            req.body.sellerEmail || "",

        status: "Available",

        available: true,

        date:
            new Date().toISOString()
    };

    products.push(newProduct);

    const saved = writeData(
        productsFile,
        products
    );

    if (!saved) {
        return res.status(500).json({
            success: false,
            message: "Could not save product"
        });
    }

    res.status(201).json({
        success: true,
        message: "Product added successfully",
        product: newProduct
    });
});

app.put("/api/products/:id", (req, res) => {
    const products = readData(productsFile);

    const id = Number(req.params.id);

    const index = products.findIndex(
        product =>
            Number(product.id) === id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Product not found"
        });
    }

    products[index] = {
        ...products[index],
        ...req.body
    };

    const saved = writeData(
        productsFile,
        products
    );

    if (!saved) {
        return res.status(500).json({
            success: false,
            message: "Could not update product"
        });
    }

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: products[index]
    });
});

app.delete("/api/products/:id", (req, res) => {
    const products = readData(productsFile);

    const id = Number(req.params.id);

    const newProducts = products.filter(
        product =>
            Number(product.id) !== id
    );

    if (
        newProducts.length ===
        products.length
    ) {
        return res.status(404).json({
            success: false,
            message: "Product not found"
        });
    }

    const saved = writeData(
        productsFile,
        newProducts
    );

    if (!saved) {
        return res.status(500).json({
            success: false,
            message: "Could not delete product"
        });
    }

    res.status(200).json({
        success: true,
        message: "Product deleted"
    });
});

// ========================================
// USERS
// ========================================

app.get("/api/users", (req, res) => {
    const users = readData(usersFile);

    res.status(200).json(users);
});

app.post("/api/users", (req, res) => {
    const users = readData(usersFile);

    const newUser = {
        id:
            users.length > 0
                ? Math.max(
                    ...users.map(
                        u => Number(u.id) || 0
                    )
                ) + 1
                : 1,

        name:
            req.body.name || "",

        email:
            req.body.email || "",

        password:
            req.body.password || "",

        date:
            new Date().toISOString()
    };

    users.push(newUser);

    const saved = writeData(
        usersFile,
        users
    );

    if (!saved) {
        return res.status(500).json({
            success: false,
            message: "Could not save user"
        });
    }

    res.status(201).json({
        success: true,
        message: "User added successfully",
        user: newUser
    });
});

// ========================================
// MESSAGES
// ========================================

// GET ALL MESSAGES

app.get("/api/messages", (req, res) => {
    const messages = readData(messagesFile);

    res.status(200).json(messages);
});

// SEND MESSAGE

app.post("/api/messages", (req, res) => {
    try {
        const messages =
            readData(messagesFile);

        const newMessage = {
            id:
                messages.length > 0
                    ? Math.max(
                        ...messages.map(
                            m =>
                                Number(m.id) || 0
                        )
                    ) + 1
                    : 1,

            sender:
                req.body.sender || "",

            receiver:
                req.body.receiver || "",

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
                req.body.message || "",

            replyTo:
                req.body.replyTo ||
                null,

            date:
                new Date().toLocaleString(
                    "en-IN"
                )
        };

        if (!newMessage.sender) {
            return res.status(400).json({
                success: false,
                message: "Sender is required"
            });
        }

        if (!newMessage.receiver) {
            return res.status(400).json({
                success: false,
                message: "Receiver is required"
            });
        }

        if (!newMessage.message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        messages.push(newMessage);

        const saved =
            writeData(
                messagesFile,
                messages
            );

        if (!saved) {
            return res.status(500).json({
                success: false,
                message:
                    "Could not save message"
            });
        }

        console.log(
            "Message saved:",
            newMessage
        );

        return res.status(201).json({
            success: true,
            message:
                "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        console.log(
            "Message error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Message could not be saved"
        });
    }
});

// ========================================
// TRANSACTIONS
// ========================================

// GET TRANSACTIONS

app.get(
    "/api/transactions",
    (req, res) => {

        const transactions =
            readData(
                transactionsFile
            );

        return res.status(200).json(
            transactions
        );
    }
);

// ADD TRANSACTION

app.post(
    "/api/transactions",
    (req, res) => {

        try {

            const transactions =
                readData(
                    transactionsFile
                );

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

                productName:
                    req.body.productName ||
                    "Unknown Product",

                amount:
                    Number(
                        req.body.amount
                    ) || 0,

                buyer:
                    req.body.buyer || "",

                seller:
                    req.body.seller || "",

                productId:
                    req.body.productId ||
                    null,

                status:
                    req.body.status ||
                    "Completed",

                date:
                    req.body.date ||
                    new Date().toISOString()
            };

            transactions.push(
                newTransaction
            );

            const saved =
                writeData(
                    transactionsFile,
                    transactions
                );

            if (!saved) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Could not save transaction"
                });
            }

            console.log(
                "Transaction saved:",
                newTransaction
            );

            return res.status(201).json({

                success: true,

                message:
                    "Transaction saved successfully",

                transaction:
                    newTransaction
            });

        } catch (error) {

            console.log(
                "Transaction error:",
                error.message
            );

            return res.status(500).json({

                success: false,

                message:
                    "Transaction could not be saved"
            });
        }
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
            "🎓 EduHub Backend Started"
        );

        console.log(
            `🌐 Server running on port ${PORT}`
        );

        console.log(
            "📦 Products: /api/products"
        );

        console.log(
            "💬 Messages: /api/messages"
        );

        console.log(
            "🧾 Transactions: /api/transactions"
        );

        console.log(
            "======================================"
        );

        console.log("");
    }
);
