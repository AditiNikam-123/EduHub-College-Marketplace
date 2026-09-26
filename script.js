const API = "https://eduhub-backend-llwi.onrender.com";

let allProducts = [];
let selectedProduct = null;

let selectedSeller = "";
let selectedProductId = null;
let selectedProductName = "";


// ==================================================
// PAGE NAVIGATION
// ==================================================

function showSection(sectionId) {

    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (sectionId === "products") {
        loadProducts();
    }

    if (sectionId === "messages") {
        loadMessages();
    }
}


// ==================================================
// LOAD PRODUCTS
// ==================================================

async function loadProducts() {

    const container = document.getElementById("productContainer");

    if (!container) return;

    container.innerHTML = `
        <div style="padding:20px;text-align:center;">
            ⏳ Loading products...
        </div>
    `;

    try {

        const response = await fetch(`${API}/api/products`);

        if (!response.ok) {
            throw new Error("Backend error");
        }

        allProducts = await response.json();

        displayProducts(allProducts);

    } catch (error) {

        console.error("Product Error:", error);

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:red;
            ">
                ❌ Not connected to backend.
                <br><br>
                Please check your Render backend.
            </div>
        `;
    }
}


// ==================================================
// DISPLAY PRODUCTS
// ==================================================

function displayProducts(products) {

    const container =
        document.getElementById("productContainer");

    if (!container) return;

    if (!products || products.length === 0) {

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
            ">
                🛍️ No products found.
            </div>
        `;

        return;
    }

    container.innerHTML = products.map(product => {

        const isSold = product.available === false;

        const marketPrice =
            Number(product.marketPrice || 0);

        const sellingPrice =
            Number(
                product.sellingPrice ??
                product.price ??
                0
            );

        const saving =
            marketPrice - sellingPrice;

        return `

        <div class="product-card"
             style="
                position:relative;
                ${isSold ? "opacity:0.7;" : ""}
             ">

            ${
                isSold
                ? `
                    <div style="
                        position:absolute;
                        top:12px;
                        right:12px;
                        background:#dc2626;
                        color:white;
                        padding:6px 12px;
                        border-radius:20px;
                        font-weight:bold;
                        z-index:5;
                    ">
                        🔴 SOLD
                    </div>
                `
                : ""
            }

            <div class="product-image">

                ${
                    product.image
                    ? `
                        <img
                            src="${escapeHTML(product.image)}"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:10px;
                            "
                        >
                    `
                    : `📚`
                }

            </div>

            <h3>
                ${escapeHTML(product.name)}
            </h3>

            <p>
                📂 ${escapeHTML(product.category)}
            </p>

            <p>
                👤 Seller:
                ${escapeHTML(product.seller)}
            </p>

            <p class="market-price">
                Market Price:
                ₹${marketPrice}
            </p>

            <p class="selling-price">
                Selling Price:
                ₹${sellingPrice}
            </p>

            ${
                !isSold
                ? `
                    <p class="saving-text">
                        💰 Save ₹${saving}
                    </p>
                `
                : `
                    <p class="sold-label">
                        This product has been sold.
                    </p>
                `
            }

            <div class="product-buttons">

                ${
                    isSold
                    ? `
                        <button
                            disabled
                            style="
                                background:#9ca3af;
                                color:white;
                                cursor:not-allowed;
                            "
                        >
                            🔴 Sold Out
                        </button>
                    `
                    : `
                        <button
                            class="buy-btn"
                            onclick="buyProduct(${product.id})"
                        >
                            🛒 Buy Now
                        </button>
                    `
                }

                <button
                    class="contact-btn"
                    onclick="
                        openMessageBox(
                            '${escapeJS(product.seller)}',
                            '${escapeJS(product.name)}',
                            ${product.id}
                        )
                    "
                >
                    💬 Message
                </button>

            </div>

        </div>

        `;

    }).join("");
}


// ==================================================
// BUY PRODUCT
// ==================================================

function buyProduct(productId) {

    selectedProduct =
        allProducts.find(
            product =>
                Number(product.id) ===
                Number(productId)
        );

    if (!selectedProduct) {
        alert("❌ Product not found.");
        return;
    }

    if (selectedProduct.available === false) {
        alert("❌ This product is already sold.");
        return;
    }

    showPurchaseModal();
}


// ==================================================
// PURCHASE MODAL
// ==================================================

function showPurchaseModal() {

    const oldModal =
        document.getElementById("purchaseModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "purchaseModal";

    modal.className = "modal";

    modal.innerHTML = `

        <div class="modal-box buy-confirm-box">

            <div class="success-icon">
                🛒
            </div>

            <h2>
                Confirm Purchase
            </h2>

            <div class="purchase-summary">

                <h3>
                    ${escapeHTML(selectedProduct.name)}
                </h3>

                <p>
                    👤 Seller:
                    ${escapeHTML(selectedProduct.seller)}
                </p>

                <strong>
                    ₹${
                        selectedProduct.sellingPrice ??
                        selectedProduct.price ??
                        0
                    }
                </strong>

            </div>

            <p>
                Enter your email to complete the purchase.
            </p>

            <input
                id="buyerEmail"
                type="email"
                placeholder="Your email"
                style="
                    width:100%;
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    margin-top:10px;
                "
            >

            <div class="modal-buttons">

                <button
                    onclick="confirmPurchase()"
                    class="buy-btn large-btn"
                >
                    ✅ Confirm Purchase
                </button>

                <button
                    onclick="closePurchaseModal()"
                    class="cancel-btn"
                >
                    Cancel
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
}


// ==================================================
// CONFIRM PURCHASE
// ==================================================

async function confirmPurchase() {

    if (!selectedProduct) {
        alert("❌ No product selected.");
        return;
    }

    const emailInput =
        document.getElementById("buyerEmail");

    if (!emailInput) {
        alert("❌ Email field not found.");
        return;
    }

    const buyer =
        emailInput.value.trim();

    if (!buyer) {
        alert("Please enter your email.");
        return;
    }

    if (!buyer.includes("@")) {
        alert("Please enter a valid email.");
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/transactions`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        buyer: buyer,
                        productId:
                            selectedProduct.id
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                "❌ " +
                (
                    data.message ||
                    "Purchase failed."
                )
            );

            return;
        }

        closePurchaseModal();

        selectedProduct.available = false;

        displayProducts(allProducts);

        showPurchaseSuccess(
            data.transaction
        );

    } catch (error) {

        console.error(error);

        alert(
            "❌ Cannot connect to Render backend."
        );
    }
}


// ==================================================
// PURCHASE SUCCESS
// ==================================================

function showPurchaseSuccess(transaction) {

    const modal =
        document.createElement("div");

    modal.id = "successModal";

    modal.className = "modal";

    modal.innerHTML = `

        <div class="modal-box success-box">

            <div class="success-big">
                🎉
            </div>

            <h2>
                Purchase Successful!
            </h2>

            <p class="success-message">
                Your transaction has been completed successfully.
            </p>

            <div class="transaction-summary">

                <p>
                    <strong>Product:</strong>
                    <span>
                        ${escapeHTML(
                            transaction.productName
                        )}
                    </span>
                </p>

                <p>
                    <strong>Amount:</strong>
                    ₹${transaction.amount}
                </p>

                <p>
                    <strong>Seller:</strong>
                    <span>
                        ${escapeHTML(
                            transaction.seller
                        )}
                    </span>
                </p>

                <p>
                    <strong>Transaction ID:</strong>
                    <span>
                        #${transaction.id}
                    </span>
                </p>

            </div>

            <button
                onclick="closeSuccess()"
                class="buy-btn large-btn"
            >
                Done
            </button>

        </div>
    `;

    document.body.appendChild(modal);
}


function closePurchaseModal() {

    const modal =
        document.getElementById(
            "purchaseModal"
        );

    if (modal) {
        modal.remove();
    }
}


function closeSuccess() {

    const modal =
        document.getElementById(
            "successModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ==================================================
// MESSAGE MODAL
// ==================================================

function openMessageBox(
    seller,
    productName,
    productId
) {

    selectedSeller = seller;

    selectedProductName = productName;

    selectedProductId = productId;

    const old =
        document.getElementById(
            "messageModal"
        );

    if (old) {
        old.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "messageModal";

    modal.className = "modal";

    modal.innerHTML = `

        <div class="modal-box">

            <button
                class="close-modal"
                onclick="closeMessageModal()"
            >
                ✕
            </button>

            <div class="modal-icon">
                💬
            </div>

            <h2>
                Message Seller
            </h2>

            <p>
                📚
                <strong>
                    ${escapeHTML(productName)}
                </strong>
            </p>

            <p>
                👤 Seller:
                ${escapeHTML(seller)}
            </p>

            <input
                id="senderEmail"
                type="email"
                placeholder="Your email"
                style="
                    width:100%;
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    margin:10px 0;
                "
            >

            <textarea
                id="messageText"
                placeholder="Write your message..."
                rows="5"
            ></textarea>

            <div class="modal-buttons">

                <button
                    onclick="sendMessage()"
                    class="send-message-btn"
                >
                    📤 Send Message
                </button>

                <button
                    onclick="closeMessageModal()"
                    class="cancel-btn"
                >
                    Cancel
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
}


// ==================================================
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    const senderInput =
        document.getElementById("senderEmail");

    const messageInput =
        document.getElementById("messageText");

    if (!senderInput || !messageInput) {
        alert("Message box not found.");
        return;
    }

    const sender =
        senderInput.value.trim();

    const message =
        messageInput.value.trim();

    if (!sender) {
        alert("Please enter your email.");
        return;
    }

    if (!sender.includes("@")) {
        alert("Please enter a valid email.");
        return;
    }

    if (!message) {
        alert("Please write a message.");
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/messages`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        sender: sender,

                        receiver:
                            selectedSeller,

                        productId:
                            selectedProductId,

                        productName:
                            selectedProductName,

                        message: message,

                        replyTo: null

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                "❌ " +
                (
                    data.message ||
                    "Message failed."
                )
            );

            return;
        }

        alert(
            "✅ Message sent successfully!"
        );

        closeMessageModal();

    } catch (error) {

        console.error(error);

        alert(
            "❌ Cannot connect to Render backend."
        );
    }
}


function closeMessageModal() {

    const modal =
        document.getElementById(
            "messageModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ==================================================
// LOAD MESSAGES
// ==================================================

async function loadMessages() {

    const container =
        document.getElementById(
            "messagesContainer"
        );

    if (!container) return;

    container.innerHTML = `
        <div style="
            padding:30px;
            text-align:center;
        ">
            ⏳ Loading messages...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API}/api/messages`
            );

        if (!response.ok) {
            throw new Error("Messages failed");
        }

        const messages =
            await response.json();

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            container.innerHTML = `
                <div class="message-empty">

                    <div style="font-size:45px;">
                        💬
                    </div>

                    <h3>
                        No messages yet
                    </h3>

                    <p>
                        Messages will appear here.
                    </p>

                </div>
            `;

            return;
        }

        const sortedMessages =
            [...messages].reverse();

        container.innerHTML =
            sortedMessages.map(msg => {

                const productName =
                    msg.productName ||
                    msg.product ||
                    "Marketplace Product";

                const messageText =
                    msg.message || "";

                const sender =
                    msg.sender || "Unknown";

                const receiver =
                    msg.receiver || "Unknown";

                const date =
                    msg.date || "";

                return `

                    <div class="message-card">

                        <div class="message-card-header">

                            <strong>
                                📚
                                ${escapeHTML(productName)}
                            </strong>

                            <span>
                                ${escapeHTML(date)}
                            </span>

                        </div>

                        <p>
                            📤
                            <strong>From:</strong>
                            ${escapeHTML(sender)}
                        </p>

                        <p>
                            📥
                            <strong>To:</strong>
                            ${escapeHTML(receiver)}
                        </p>

                        <div class="message-content">

                            💬
                            ${escapeHTML(messageText)}

                        </div>

                        <button
                            class="buy-btn"
                            onclick="
                                replyMessage(
                                    '${escapeJS(sender)}',
                                    ${msg.id || 0},
                                    '${escapeJS(productName)}',
                                    ${msg.productId || "null"}
                                )
                            "
                        >
                            ↩️ Reply
                        </button>

                    </div>

                `;

            }).join("");

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:red;
            ">
                ❌ Unable to load messages.
            </div>
        `;
    }
}


// ==================================================
// REPLY MESSAGE
// ==================================================

async function replyMessage(
    receiver,
    messageId,
    productName,
    productId
) {

    const sender =
        prompt("Enter your email:");

    if (!sender) return;

    const message =
        prompt("Enter your reply:");

    if (!message) return;

    try {

        const response =
            await fetch(
                `${API}/api/messages`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        sender: sender,

                        receiver: receiver,

                        productId: productId,

                        productName: productName,

                        message: message,

                        replyTo: messageId

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Reply failed."
            );

            return;
        }

        alert("✅ Reply sent!");

        loadMessages();

    } catch (error) {

        console.error(error);

        alert(
            "❌ Backend connection failed."
        );
    }
}


// ==================================================
// SEARCH
// ==================================================

function searchProducts() {

    const input =
        document.getElementById(
            "searchInput"
        );

    const category =
        document.getElementById(
            "categoryFilter"
        );

    const search =
        input
        ? input.value.toLowerCase()
        : "";

    const selectedCategory =
        category
        ? category.value
        : "all";

    const filtered =
        allProducts.filter(product => {

            const matchesSearch =
                String(product.name || "")
                    .toLowerCase()
                    .includes(search);

            const matchesCategory =
                selectedCategory === "all" ||
                product.category ===
                selectedCategory;

            return (
                matchesSearch &&
                matchesCategory
            );
        });

    displayProducts(filtered);
}


function filterCategory() {
    searchProducts();
}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==================================================
// ESCAPE JAVASCRIPT
// ==================================================

function escapeJS(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ==================================================
// START WEBSITE
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProducts();

    }
);
