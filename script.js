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
}


// ==================================================
// LOAD PRODUCTS
// ==================================================

async function loadProducts() {

    const container = document.getElementById("productContainer");

    if (!container) return;

    container.innerHTML = "⏳ Loading products...";

    try {

        const response = await fetch(`${API}/api/products`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        allProducts = await response.json();

        displayProducts(allProducts);

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div style="padding:30px;text-align:center;color:red;">
                ❌ Unable to connect to EduHub backend.
            </div>
        `;
    }
}


// ==================================================
// DISPLAY PRODUCTS
// ==================================================

function displayProducts(products) {

    const container = document.getElementById("productContainer");

    if (!container) return;

    if (!products.length) {

        container.innerHTML = `
            <div style="padding:30px;text-align:center;">
                🛍️ No products available.
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
             style="position:relative;">

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
                    : "📚"
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
                    !isSold
                    ? `
                        <button
                            class="buy-btn"
                            onclick="buyProduct(${product.id})"
                        >
                            🛒 Buy Now
                        </button>
                    `
                    : `
                        <button
                            disabled
                            style="
                                background:#9ca3af;
                                color:white;
                                border:none;
                                padding:10px;
                                border-radius:8px;
                            "
                        >
                            🔴 Sold Out
                        </button>
                    `
                }


                <button
                    class="contact-btn"
                    onclick="
                        openMessageBox(
                            '${escapeJS(product.sellerEmail || product.seller)}',
                            '${escapeJS(product.name)}',
                            ${product.id}
                        )
                    "
                >
                    💬 Message
                </button>


                <button
                    class="details-btn"
                    onclick="showProductDetails(${product.id})"
                >
                    👁️ Details
                </button>

            </div>

        </div>

        `;

    }).join("");
}


// ==================================================
// PRODUCT DETAILS
// ==================================================

function showProductDetails(productId) {

    const product =
        allProducts.find(
            p => Number(p.id) === Number(productId)
        );

    if (!product) return;

    selectedProduct = product;

    const modal =
        document.getElementById("detailsModal");

    if (!modal) return;

    document.getElementById("detailsProductName").innerText =
        product.name;

    document.getElementById("detailsCategory").innerText =
        "📂 Category: " + product.category;

    document.getElementById("detailsSeller").innerText =
        "👤 Seller: " + product.seller;

    document.getElementById("detailsMarketPrice").innerText =
        "Original Price: ₹" +
        (product.marketPrice || 0);

    document.getElementById("detailsSellingPrice").innerText =
        "Selling Price: ₹" +
        (product.sellingPrice ?? product.price ?? 0);

    const saving =
        Number(product.marketPrice || 0) -
        Number(product.sellingPrice ?? product.price ?? 0);

    document.getElementById("detailsSaving").innerText =
        saving > 0
        ? "💰 You Save ₹" + saving
        : "";

    const buyButton =
        document.getElementById("detailsBuyButton");

    if (product.available === false) {

        buyButton.disabled = true;
        buyButton.innerText = "🔴 Sold Out";

    } else {

        buyButton.disabled = false;
        buyButton.innerText = "🛒 Buy Now";

        buyButton.onclick = function () {
            closeDetailsModal();
            buyProduct(product.id);
        };
    }

    modal.classList.remove("hidden");
}


function closeDetailsModal() {

    const modal =
        document.getElementById("detailsModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


// ==================================================
// BUY PRODUCT
// ==================================================

function buyProduct(productId) {

    selectedProduct =
        allProducts.find(
            p => Number(p.id) === Number(productId)
        );

    if (!selectedProduct) {

        alert("❌ Product not found.");

        return;
    }

    if (selectedProduct.available === false) {

        alert("❌ This product is already sold.");

        return;
    }

    document.getElementById("buyProductName").innerText =
        selectedProduct.name;

    document.getElementById("buyProductSeller").innerText =
        "👤 Seller: " + selectedProduct.seller;

    document.getElementById("buyProductPrice").innerText =
        "₹" +
        (selectedProduct.sellingPrice ??
         selectedProduct.price ??
         0);

    document
        .getElementById("buyModal")
        .classList.remove("hidden");
}


function closeBuyModal() {

    document
        .getElementById("buyModal")
        .classList.add("hidden");
}


// ==================================================
// CONFIRM PURCHASE
// ==================================================

async function confirmPurchase() {

    if (!selectedProduct) {

        alert("❌ No product selected.");

        return;
    }

    let buyer =
        localStorage.getItem("userEmail");

    if (!buyer) {

        buyer =
            prompt("Enter your email:");

    }

    if (!buyer) {

        alert("Please enter your email.");

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


        closeBuyModal();

        selectedProduct.available = false;

        displayProducts(allProducts);

        showPurchaseSuccess(data.transaction);

    } catch (error) {

        console.error(error);

        alert("❌ Backend connection failed.");
    }
}


// ==================================================
// PURCHASE SUCCESS
// ==================================================

function showPurchaseSuccess(transaction) {

    document.getElementById("successProduct").innerText =
        transaction.productName;

    document.getElementById("successAmount").innerText =
        transaction.amount;

    document.getElementById("successSeller").innerText =
        transaction.seller;

    document.getElementById("successTransactionId").innerText =
        transaction.id;

    document
        .getElementById("successModal")
        .classList.remove("hidden");
}


function closeSuccessModal() {

    document
        .getElementById("successModal")
        .classList.add("hidden");
}


// ==================================================
// SELL PRODUCT
// ==================================================

document.addEventListener("DOMContentLoaded", function () {

    const form =
        document.getElementById("productForm");

    if (!form) return;

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const name =
            document.getElementById("productName").value.trim();

        const marketPrice =
            Number(
                document.getElementById("marketPrice").value
            );

        const sellingPrice =
            Number(
                document.getElementById("sellingPrice").value
            );

        const category =
            document.getElementById("category").value;

        const seller =
            document.getElementById("sellerName").value.trim();

        const sellerEmail =
            localStorage.getItem("userEmail") || seller;


        if (sellingPrice > marketPrice) {

            alert(
                "Selling price should not be greater than market price."
            );

            return;
        }


        try {

            const response =
                await fetch(
                    `${API}/api/products`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name: name,

                            marketPrice:
                                marketPrice,

                            sellingPrice:
                                sellingPrice,

                            price:
                                sellingPrice,

                            category:
                                category,

                            seller:
                                seller,

                            sellerEmail:
                                sellerEmail,

                            available:
                                true

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
                        "Product could not be added."
                    )
                );

                return;
            }


            alert(
                "✅ Product listed successfully!"
            );


            form.reset();

            loadProducts();

        } catch (error) {

            console.error(error);

            alert(
                "❌ Cannot connect to EduHub backend."
            );
        }

    });

});


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

    const modal =
        document.getElementById("messageModal");

    if (!modal) return;

    document.getElementById("messageSeller").innerText =
        "Seller: " + seller;

    document.getElementById("messageProduct").innerText =
        "Product: " + productName;

    document.getElementById("sellerMessage").value = "";

    modal.classList.remove("hidden");
}


function closeMessageBox() {

    const modal =
        document.getElementById("messageModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


// ==================================================
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    const messageInput =
        document.getElementById("sellerMessage");

    if (!messageInput) return;

    const message =
        messageInput.value.trim();

    if (!message) {

        alert("Please write a message.");

        return;
    }


    const sender =
        localStorage.getItem("userEmail") ||
        prompt("Enter your email:");


    if (!sender) return;


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

                        message:
                            message,

                        replyTo:
                            null
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


        alert("✅ Message sent successfully!");

        closeMessageBox();

    } catch (error) {

        console.error(error);

        alert("❌ Cannot connect to backend.");
    }
}


// ==================================================
// SEARCH
// ==================================================

function searchProducts() {

    const input =
        document.getElementById("searchInput");

    const category =
        document.getElementById("categoryFilter");

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
                product.category === selectedCategory;

            return matchesSearch &&
                   matchesCategory;
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
// ESCAPE JS
// ==================================================

function escapeJS(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ==================================================
// START
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadProducts();

    }
);
