const API =
    "https://eduhub-backend-llwi.onrender.com";

let allProducts = [];

let selectedProduct = null;

let selectedSeller = "";

let selectedProductId = null;

let selectedProductName = "";

// ==================================================
// PAGE NAVIGATION
// ==================================================

function showSection(
    sectionId
) {

    document
        .querySelectorAll(
            ".section"
        )
        .forEach(
            section =>
                section.classList.remove(
                    "active"
                )
        );

    const section =
        document.getElementById(
            sectionId
        );

    if (section) {

        section.classList.add(
            "active"
        );
    }

    if (
        sectionId ===
        "products"
    ) {

        loadProducts();
    }

    if (
        sectionId ===
        "messages"
    ) {

        loadMessages();
    }
}


// ==================================================
// LOAD PRODUCTS
// ==================================================

async function loadProducts() {

    const container =
        document.getElementById(
            "productContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        `
        <div style="
            padding:20px;
            text-align:center;
        ">
            ⏳ Loading products...
        </div>
        `;

    try {

        const response =
            await fetch(
                `${API}/api/products`
            );

        if (!response.ok) {

            throw new Error(
                "Products could not be loaded."
            );
        }

        allProducts =
            await response.json();

        displayProducts(
            allProducts
        );

    } catch (error) {

        console.error(
            error
        );

        container.innerHTML =
            `
            <div style="
                padding:30px;
                text-align:center;
                color:red;
            ">
                ❌ Backend connection failed.
            </div>
            `;
    }
}


// ==================================================
// DISPLAY PRODUCTS
// ==================================================

function displayProducts(
    products
) {

    const container =
        document.getElementById(
            "productContainer"
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(
            products
        ) ||
        products.length === 0
    ) {

        container.innerHTML =
            `
            <div style="
                padding:30px;
                text-align:center;
            ">
                🛍️ No products found.
            </div>
            `;

        return;
    }

    container.innerHTML =
        products.map(
            product => {

                const isSold =
                    product.available ===
                    false;

                const name =
                    product.name ||
                    product.productName ||
                    "Product";

                const seller =
                    product.seller ||
                    product.sellerName ||
                    "";

                const marketPrice =
                    Number(
                        product.marketPrice ||
                        0
                    );

                const sellingPrice =
                    Number(
                        product.sellingPrice ||
                        0
                    );

                const saving =
                    marketPrice -
                    sellingPrice;

                return `
                <div
                    class="product-card"
                    style="
                        position:relative;
                        ${
                            isSold
                                ? "opacity:.72;"
                                : ""
                        }
                    "
                >

                    ${
                        isSold
                            ? `
                            <div style="
                                position:absolute;
                                top:12px;
                                right:12px;
                                background:#dc2626;
                                color:white;
                                padding:7px 13px;
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
                                    src="${escapeHTML(
                                        product.image
                                    )}"
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
                        ${escapeHTML(
                            name
                        )}
                    </h3>

                    <p>
                        📂
                        ${escapeHTML(
                            product.category ||
                            "Other"
                        )}
                    </p>

                    <p>
                        👤 Seller:
                        ${escapeHTML(
                            seller
                        )}
                    </p>

                    <p>
                        Market Price:
                        ₹${marketPrice}
                    </p>

                    <p style="
                        font-size:20px;
                        font-weight:bold;
                        color:#4f46e5;
                    ">
                        ₹${sellingPrice}
                    </p>

                    ${
                        !isSold
                            ? `
                            <p style="
                                color:#15803d;
                            ">
                                💰 Save ₹${Math.max(
                                    0,
                                    saving
                                )}
                            </p>
                            `
                            : `
                            <p style="
                                color:#dc2626;
                                font-weight:bold;
                            ">
                                This product has been sold.
                            </p>
                            `
                    }

                    <div style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:15px;
                    ">

                        ${
                            isSold
                                ? `
                                <button
                                    disabled
                                    style="
                                        flex:1;
                                        padding:11px;
                                        border:none;
                                        border-radius:8px;
                                        background:#9ca3af;
                                        color:white;
                                    "
                                >
                                    🔴 Sold Out
                                </button>
                                `
                                : `
                                <button
                                    onclick="
                                        buyProduct(
                                            ${Number(
                                                product.id
                                            )}
                                        )
                                    "
                                    style="
                                        flex:1;
                                        padding:11px;
                                        border:none;
                                        border-radius:8px;
                                        background:#4f46e5;
                                        color:white;
                                        font-weight:bold;
                                        cursor:pointer;
                                    "
                                >
                                    🛒 Buy Now
                                </button>
                                `
                        }

                        <button
                            onclick="
                                openMessageBox(
                                    '${escapeJS(
                                        seller
                                    )}',
                                    '${escapeJS(
                                        name
                                    )}',
                                    ${Number(
                                        product.id
                                    )}
                                )
                            "
                            style="
                                flex:1;
                                padding:11px;
                                border:none;
                                border-radius:8px;
                                background:#111827;
                                color:white;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            💬 Message
                        </button>

                    </div>

                </div>
                `;
            }
        )
        .join("");
}


// ==================================================
// BUY PRODUCT
// ==================================================

function buyProduct(
    productId
) {

    selectedProduct =
        allProducts.find(
            product =>
                Number(
                    product.id
                ) ===
                Number(
                    productId
                )
        );

    if (!selectedProduct) {

        alert(
            "❌ Product not found."
        );

        return;
    }

    if (
        selectedProduct.available ===
        false
    ) {

        alert(
            "❌ This product is already sold."
        );

        return;
    }

    showPurchaseModal();
}


// ==================================================
// PURCHASE MODAL
// ==================================================

function showPurchaseModal() {

    const old =
        document.getElementById(
            "paytmPurchaseModal"
        );

    if (old) {
        old.remove();
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "paytmPurchaseModal";

    modal.style.cssText =
        `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.65);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:99999;
        padding:20px;
        `;

    const name =
        selectedProduct.name ||
        selectedProduct.productName ||
        "Product";

    const seller =
        selectedProduct.seller ||
        selectedProduct.sellerName ||
        "";

    const price =
        Number(
            selectedProduct.sellingPrice ||
            0
        );

    modal.innerHTML =
        `
        <div style="
            background:white;
            width:100%;
            max-width:450px;
            border-radius:18px;
            padding:30px;
            box-shadow:0 20px 50px rgba(0,0,0,.25);
        ">

            <h2 style="
                color:#312e81;
                margin-top:0;
            ">
                🛒 Pay with Paytm
            </h2>

            <p>
                <strong>
                    Product:
                </strong>

                ${escapeHTML(
                    name
                )}
            </p>

            <p>
                <strong>
                    Seller:
                </strong>

                ${escapeHTML(
                    seller
                )}
            </p>

            <p style="
                font-size:24px;
                font-weight:bold;
                color:#4f46e5;
            ">
                ₹${price.toFixed(2)}
            </p>

            <hr>

            <p style="
                color:#4b5563;
            ">
                Enter your details to continue to Paytm.
            </p>

            <input
                id="buyerEmail"
                type="email"
                placeholder="Your email"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    margin:10px 0;
                "
            >

            <input
                id="buyerMobile"
                type="tel"
                inputmode="numeric"
                maxlength="10"
                placeholder="10-digit mobile number"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    margin:10px 0;
                "
            >

            <div style="
                display:flex;
                gap:10px;
                margin-top:20px;
            ">

                <button
                    id="paytmPayButton"
                    onclick="
                        confirmPurchase()
                    "
                    style="
                        flex:1;
                        padding:12px;
                        border:none;
                        border-radius:8px;
                        background:#16a34a;
                        color:white;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    💳 Continue to Paytm
                </button>

                <button
                    onclick="
                        closePurchaseModal()
                    "
                    style="
                        flex:1;
                        padding:12px;
                        border:none;
                        border-radius:8px;
                        background:#e5e7eb;
                        cursor:pointer;
                    "
                >
                    Cancel
                </button>

            </div>

        </div>
        `;

    document.body.appendChild(
        modal
    );
}


// ==================================================
// CLOSE PURCHASE MODAL
// ==================================================

function closePurchaseModal() {

    const modal =
        document.getElementById(
            "paytmPurchaseModal"
        );

    if (modal) {

        modal.remove();
    }
}


// ==================================================
// START PAYTM PAYMENT
// ==================================================

async function confirmPurchase() {

    if (!selectedProduct) {

        alert(
            "No product selected."
        );

        return;
    }

    const emailInput =
        document.getElementById(
            "buyerEmail"
        );

    const mobileInput =
        document.getElementById(
            "buyerMobile"
        );

    const button =
        document.getElementById(
            "paytmPayButton"
        );

    const buyerEmail =
        emailInput
            ? emailInput.value.trim()
            : "";

    const buyerMobile =
        mobileInput
            ? mobileInput.value.trim()
            : "";

    if (
        !buyerEmail ||
        !buyerEmail.includes("@")
    ) {

        alert(
            "Please enter a valid email."
        );

        return;
    }

    if (
        !/^\d{10}$/.test(
            buyerMobile
        )
    ) {

        alert(
            "Please enter a valid 10-digit mobile number."
        );

        return;
    }

    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "⏳ Creating payment...";
        }

        const response =
            await fetch(
                `${API}/api/paytm/create-payment`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            productId:
                                selectedProduct.id,

                            buyerEmail:
                                buyerEmail,

                            buyerMobile:
                                buyerMobile
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Could not create payment."
            );
        }

        // Redirect to Paytm payment page
        window.location.href =
            data.paymentUrl;

    } catch (error) {

        console.error(
            "Payment error:",
            error
        );

        alert(
            "❌ " +
            (
                error.message ||
                "Unable to start payment."
            )
        );

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💳 Continue to Paytm";
        }
    }
}


// ==================================================
// PAYTM RETURN
// ==================================================

async function handlePaytmReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const status =
        params.get(
            "paytm_status"
        );

    const orderId =
        params.get(
            "orderId"
        );

    if (
        !status ||
        !orderId
    ) {

        return;
    }

    if (
        status ===
        "TXN_SUCCESS"
    ) {

        await checkCompletedPayment(
            orderId
        );

    } else if (
        status ===
        "PENDING"
    ) {

        alert(
            "⏳ Payment is still being confirmed."
        );

    } else {

        alert(
            "❌ Payment was not successful."
        );
    }

    // Remove query parameters
    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );
}


// ==================================================
// CHECK COMPLETED PAYMENT
// ==================================================

async function checkCompletedPayment(
    orderId
) {

    try {

        const response =
            await fetch(
                `${API}/api/paytm/order/${encodeURIComponent(
                    orderId
                )}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            return;
        }

        const order =
            data.order;

        if (
            order.paymentStatus !==
            "TXN_SUCCESS"
        ) {

            alert(
                "⏳ Payment status is still being updated."
            );

            return;
        }

        const product =
            allProducts.find(
                item =>
                    Number(
                        item.id
                    ) ===
                    Number(
                        order.productId
                    )
            );

        if (product) {

            product.available =
                false;

            product.status =
                "Sold";
        }

        displayProducts(
            allProducts
        );

        showPurchaseSuccess({

            id:
                orderId,

            productName:
                order.productName,

            amount:
                order.amount,

            seller:
                order.seller,

            paytmOrderId:
                order.orderId
        });

    } catch (error) {

        console.error(
            "Payment result error:",
            error
        );
    }
}


// ==================================================
// PURCHASE SUCCESS
// ==================================================

function showPurchaseSuccess(
    transaction
) {

    const old =
        document.getElementById(
            "paytmSuccessModal"
        );

    if (old) {
        old.remove();
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "paytmSuccessModal";

    modal.style.cssText =
        `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.65);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:100000;
        padding:20px;
        `;

    modal.innerHTML =
        `
        <div style="
            background:white;
            width:100%;
            max-width:480px;
            border-radius:18px;
            padding:30px;
        ">

            <div style="
                text-align:center;
                font-size:55px;
            ">
                🎉
            </div>

            <h2 style="
                text-align:center;
                color:#15803d;
            ">
                Purchase Successful!
            </h2>

            <hr>

            <p>
                🛍️
                <strong>
                    Product:
                </strong>

                ${escapeHTML(
                    transaction.productName
                )}
            </p>

            <p>
                💰
                <strong>
                    Amount:
                </strong>

                ₹${escapeHTML(
                    transaction.amount
                )}
            </p>

            <p>
                👤
                <strong>
                    Seller:
                </strong>

                ${escapeHTML(
                    transaction.seller
                )}
            </p>

            <p>
                🆔
                <strong>
                    Paytm Order ID:
                </strong>

                ${escapeHTML(
                    transaction.paytmOrderId ||
                    transaction.id
                )}
            </p>

            <p>
                📌
                <strong>
                    Status:
                </strong>

                <span style="
                    color:#15803d;
                ">
                    ✓ Completed
                </span>
            </p>

            <button
                onclick="
                    closeSuccess()
                "
                style="
                    width:100%;
                    padding:12px;
                    border:none;
                    border-radius:8px;
                    background:#4f46e5;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                    margin-top:15px;
                "
            >
                Done
            </button>

        </div>
        `;

    document.body.appendChild(
        modal
    );
}


function closeSuccess() {

    const modal =
        document.getElementById(
            "paytmSuccessModal"
        );

    if (modal) {

        modal.remove();
    }
}


// ==================================================
// MESSAGE SELLER
// ==================================================

function openMessageBox(
    seller,
    productName,
    productId
) {

    selectedSeller =
        seller;

    selectedProductName =
        productName;

    selectedProductId =
        productId;

    const modal =
        document.getElementById(
            "messageModal"
        );

    if (!modal) {
        return;
    }

    const sellerText =
        document.getElementById(
            "messageSeller"
        );

    const productText =
        document.getElementById(
            "messageProduct"
        );

    const textBox =
        document.getElementById(
            "sellerMessage"
        );

    if (sellerText) {

        sellerText.textContent =
            `Seller: ${seller}`;
    }

    if (productText) {

        productText.textContent =
            `Product: ${productName}`;
    }

    if (textBox) {

        textBox.value =
            "";
    }

    modal.classList.remove(
        "hidden"
    );
}


function closeMessageBox() {

    const modal =
        document.getElementById(
            "messageModal"
        );

    if (modal) {

        modal.classList.add(
            "hidden"
        );
    }
}


// ==================================================
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    const textBox =
        document.getElementById(
            "sellerMessage"
        );

    const sender =
        localStorage.getItem(
            "userEmail"
        ) ||
        prompt(
            "Enter your email:"
        );

    if (
        !sender ||
        !sender.includes("@")
    ) {

        alert(
            "Please enter a valid email."
        );

        return;
    }

    if (
        !textBox ||
        !textBox.value.trim()
    ) {

        alert(
            "Please write a message."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/messages`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            sender,

                            receiver:
                                selectedSeller,

                            productId:
                                selectedProductId,

                            productName:
                                selectedProductName,

                            message:
                                textBox.value.trim(),

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

        alert(
            "✅ Message sent successfully!"
        );

        closeMessageBox();

        loadMessages();

    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ Cannot connect to backend."
        );
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

    if (!container) {
        return;
    }

    container.innerHTML =
        `
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

        const messages =
            await response.json();

        if (
            !Array.isArray(
                messages
            ) ||
            messages.length === 0
        ) {

            container.innerHTML =
                `
                <div style="
                    padding:30px;
                    text-align:center;
                ">
                    💬 No messages yet.
                </div>
                `;

            return;
        }

        container.innerHTML =
            [...messages]
                .reverse()
                .map(
                    msg => {

                        const name =
                            msg.productName ||
                            msg.product ||
                            "Marketplace Product";

                        return `
                        <div style="
                            background:white;
                            padding:20px;
                            margin-bottom:15px;
                            border-radius:15px;
                            box-shadow:
                                0 4px 15px
                                rgba(0,0,0,.08);
                        ">

                            <h3 style="
                                color:#312e81;
                                margin-top:0;
                            ">
                                📚
                                ${escapeHTML(
                                    name
                                )}
                            </h3>

                            <p>
                                📤
                                <strong>
                                    From:
                                </strong>

                                ${escapeHTML(
                                    msg.sender ||
                                    ""
                                )}
                            </p>

                            <p>
                                📥
                                <strong>
                                    To:
                                </strong>

                                ${escapeHTML(
                                    msg.receiver ||
                                    ""
                                )}
                            </p>

                            <div style="
                                background:#f3f4f6;
                                padding:15px;
                                border-radius:10px;
                            ">
                                💬
                                ${escapeHTML(
                                    msg.message ||
                                    ""
                                )}
                            </div>

                            <p style="
                                font-size:12px;
                                color:#6b7280;
                            ">
                                ${escapeHTML(
                                    msg.date ||
                                    ""
                                )}
                            </p>

                            <button
                                onclick="
                                    replyMessage(
                                        '${escapeJS(
                                            msg.sender ||
                                            ""
                                        )}',
                                        ${
                                            Number(
                                                msg.id
                                            ) || 0
                                        },
                                        '${escapeJS(
                                            name
                                        )}',
                                        ${
                                            msg.productId ==
                                            null
                                                ? "null"
                                                : Number(
                                                      msg.productId
                                                  )
                                        }
                                    )
                                "
                                style="
                                    padding:9px 16px;
                                    border:none;
                                    border-radius:8px;
                                    background:#4f46e5;
                                    color:white;
                                    font-weight:bold;
                                    cursor:pointer;
                                "
                            >
                                ↩️ Reply
                            </button>

                        </div>
                        `;
                    }
                )
                .join("");

    } catch (error) {

        console.error(
            error
        );

        container.innerHTML =
            `
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
        localStorage.getItem(
            "userEmail"
        ) ||
        prompt(
            "Enter your email:"
        );

    if (
        !sender ||
        !sender.includes("@")
    ) {

        return;
    }

    const message =
        prompt(
            "Enter your reply:"
        );

    if (!message) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/messages`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            sender,

                            receiver,

                            productId,

                            productName,

                            message,

                            replyTo:
                                messageId
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
                    "Reply failed."
                )
            );

            return;
        }

        alert(
            "✅ Reply sent!"
        );

        loadMessages();

    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ Backend connection failed."
        );
    }
}


// ==================================================
// SEARCH PRODUCTS
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
        allProducts.filter(
            product => {

                const name =
                    String(
                        product.name ||
                        product.productName ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    name.includes(
                        search
                    );

                const matchesCategory =
                    selectedCategory ===
                        "all" ||
                    product.category ===
                        selectedCategory;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );

    displayProducts(
        filtered
    );
}


function filterCategory() {

    searchProducts();
}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ==================================================
// ESCAPE JS
// ==================================================

function escapeJS(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        );
}


// ==================================================
// LOGOUT
// ==================================================

function logoutUser() {

    const confirmation =
        confirm(
            "Are you sure you want to logout?"
        );

    if (!confirmation) {
        return;
    }

    localStorage.removeItem(
        "userName"
    );

    localStorage.removeItem(
        "userEmail"
    );

    localStorage.removeItem(
        "user"
    );

    window.location.href =
        "login.html";
}


// ==================================================
// START WEBSITE
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProducts();

        loadMessages();

        handlePaytmReturn();
    }
);
