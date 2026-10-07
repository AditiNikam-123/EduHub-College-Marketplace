const API =
    "https://eduhub-backend-llwi.onrender.com";

let allProducts = [];

let selectedProduct = null;

let selectedSeller = "";

let selectedProductId = null;

let selectedProductName = "";

let paytmScriptPromise = null;

let paytmHandledOrders =
    new Set();

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
                "Products could not be loaded"
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
        !products.length
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
        products
            .map(
                product => {

                    const isSold =
                        product.available ===
                        false;

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

                    const name =
                        product.name ||
                        product.productName ||
                        "Product";

                    const seller =
                        product.seller ||
                        product.sellerName ||
                        "";

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
            "❌ Sorry! This product is already sold."
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
                    selectedProduct.name ||
                    selectedProduct.productName
                )}
            </p>

            <p>
                <strong>
                    Seller:
                </strong>

                ${escapeHTML(
                    selectedProduct.seller ||
                    selectedProduct.sellerName ||
                    ""
                )}
            </p>

            <p style="
                font-size:24px;
                font-weight:bold;
                color:#4f46e5;
            ">
                ₹${Number(
                    selectedProduct.sellingPrice
                ).toFixed(2)}
            </p>

            <hr>

            <p style="
                color:#4b5563;
            ">
                Enter your details to continue to Paytm checkout.
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
// CLOSE PURCHASE
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
// LOAD PAYTM CHECKOUT
// ==================================================

async function loadPaytmCheckoutScript(
    url
) {

    if (
        window.Paytm &&
        window.Paytm.CheckoutJS
    ) {

        return;
    }

    if (paytmScriptPromise) {

        return paytmScriptPromise;
    }

    if (!url) {

        throw new Error(
            "Paytm CheckoutJS URL is missing."
        );
    }

    paytmScriptPromise =
        new Promise(
            (
                resolve,
                reject
            ) => {

                const script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    url;

                script.async =
                    true;

                script.onload =
                    function() {

                        if (
                            !window.Paytm ||
                            !window.Paytm.CheckoutJS
                        ) {

                            reject(
                                new Error(
                                    "Paytm CheckoutJS did not load."
                                )
                            );

                            return;
                        }

                        window.Paytm.CheckoutJS.onLoad(
                            function() {

                                resolve();
                            }
                        );
                    };

                script.onerror =
                    function() {

                        reject(
                            new Error(
                                "Paytm CheckoutJS could not load."
                            )
                        );
                    };

                document.head.appendChild(
                    script
                );
            }
        );

    return paytmScriptPromise;
}

// ==================================================
// CONFIRM PURCHASE
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

    const buyer =
        emailInput
            ? emailInput.value.trim()
            : "";

    const mobile =
        mobileInput
            ? mobileInput.value.trim()
            : "";

    if (
        !buyer ||
        !buyer.includes("@")
    ) {

        alert(
            "Please enter a valid email."
        );

        return;
    }

    if (
        !/^\d{10}$/.test(
            mobile
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
                "⏳ Opening Paytm...";
        }

        const response =
            await fetch(
                `${API}/api/paytm/create-order`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                selectedProduct.id,

                            buyer:
                                buyer,

                            mobile:
                                mobile
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
                "Could not create Paytm order."
            );
        }

        await loadPaytmCheckoutScript(
            data.checkoutJsUrl
        );

        const config = {

            root: "",

            flow:
                "DEFAULT",

            data: {

                orderId:
                    data.orderId,

                token:
                    data.txnToken,

                tokenType:
                    "TXN_TOKEN",

                amount:
                    data.amount
            },

            merchant: {

                redirect:
                    true
            },

            handler: {

                notifyMerchant:
                    function(
                        eventName,
                        eventData
                    ) {

                        console.log(
                            "Paytm event:",
                            eventName,
                            eventData
                        );
                    },

                transactionStatus:
                    function(
                        paymentData
                    ) {

                        const orderId =
                            paymentData &&
                            paymentData.ORDERID
                                ? paymentData.ORDERID
                                : data.orderId;

                        if (
                            paymentData &&
                            paymentData.STATUS ===
                                "TXN_SUCCESS"
                        ) {

                            reconcilePaytmOrder(
                                orderId
                            );

                            return;
                        }

                        if (
                            paymentData &&
                            paymentData.STATUS ===
                                "PENDING"
                        ) {

                            reconcilePaytmOrder(
                                orderId
                            );

                            return;
                        }

                        alert(
                            "❌ Payment failed or was cancelled."
                        );
                    }
            }
        };

        await window.Paytm.CheckoutJS.init(
            config
        );

        window.Paytm.CheckoutJS.invoke();

    } catch (error) {

        console.error(
            "Paytm payment error:",
            error
        );

        alert(
            "❌ " +
            (
                error.message ||
                "Unable to open Paytm payment."
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
// VERIFY PAYMENT
// ==================================================

async function reconcilePaytmOrder(
    orderId
) {

    if (!orderId) {
        return;
    }

    if (
        paytmHandledOrders.has(
            orderId
        )
    ) {

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/paytm/verify`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            orderId
                        })
                }
            );

        const data =
            await response.json();

        if (
            data.success &&
            data.transaction
        ) {

            paytmHandledOrders.add(
                orderId
            );

            closePurchaseModal();

            const product =
                allProducts.find(
                    p =>
                        Number(
                            p.id
                        ) ===
                        Number(
                            data.transaction.productId
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

            showPurchaseSuccess(
                data.transaction
            );

            return;
        }

        if (
            data.paymentStatus ===
            "PENDING"
        ) {

            alert(
                "⏳ Payment is still pending. Please check Transaction History shortly."
            );

            return;
        }

        alert(
            "❌ " +
            (
                data.message ||
                "Payment could not be verified."
            )
        );

    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ Payment verification could not be reached right now. Please check Transaction History shortly."
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
                    Transaction ID:
                </strong>

                #${escapeHTML(
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

    const messageBox =
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

    if (messageBox) {

        messageBox.value =
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

    const messageBox =
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
        !messageBox ||
        !messageBox.value.trim()
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
                    method: "POST",

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
                                messageBox.value.trim(),

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

        if (!response.ok) {

            throw new Error(
                "Messages failed"
            );
        }

        const messages =
            await response.json();

        if (
            !Array.isArray(
                messages
            ) ||
            !messages.length
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

                        const productName =
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
                                margin:0;
                                color:#312e81;
                            ">
                                📚
                                ${escapeHTML(
                                    productName
                                )}
                            </h3>

                            <p>
                                📤
                                <strong>
                                    From:
                                </strong>

                                ${escapeHTML(
                                    msg.sender
                                )}
                            </p>

                            <p>
                                📥
                                <strong>
                                    To:
                                </strong>

                                ${escapeHTML(
                                    msg.receiver
                                )}
                            </p>

                            <div style="
                                background:#f3f4f6;
                                padding:15px;
                                border-radius:10px;
                            ">
                                💬
                                ${escapeHTML(
                                    msg.message
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
                                            msg.sender
                                        )}',
                                        ${
                                            Number(
                                                msg.id
                                            ) || 0
                                        },
                                        '${escapeJS(
                                            productName
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

    const message =
        prompt(
            "Enter your reply:"
        );

    if (
        !sender ||
        !sender.includes("@") ||
        !message
    ) {

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
        allProducts.filter(
            product => {

                const name =
                    String(
                        product.name ||
                        product.productName ||
                        ""
                    ).toLowerCase();

                const matchSearch =
                    name.includes(
                        search
                    );

                const matchCategory =
                    selectedCategory ===
                        "all" ||
                    product.category ===
                        selectedCategory;

                return (
                    matchSearch &&
                    matchCategory
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

    const confirmLogout =
        confirm(
            "Are you sure you want to logout?"
        );

    if (!confirmLogout) {
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
// PAYTM RETURN
// ==================================================

async function handlePaytmReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const orderId =
        params.get(
            "orderId"
        );

    if (!orderId) {
        return;
    }

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );

    await reconcilePaytmOrder(
        orderId
    );
}

// ==================================================
// START
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProducts();

        loadMessages();

        handlePaytmReturn();
    }
);
