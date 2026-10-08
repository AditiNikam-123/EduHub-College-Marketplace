// ==================================================
// EduHub College Marketplace - script.js
// ==================================================

const API = "https://eduhub-backend-llwi.onrender.com";

let allProducts = [];
let selectedProduct = null;

let selectedSeller = "";
let selectedProductId = null;
let selectedProductName = "";

let paytmScriptPromise = null;
let paytmHandledOrders = new Set();


// ==================================================
// COMMON HELPERS
// ==================================================

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeJS(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


function getCurrentUserEmail() {
    return (
        localStorage.getItem("userEmail") ||
        ""
    ).trim();
}


// ==================================================
// PAGE NAVIGATION
// ==================================================

function showSection(sectionId) {

    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const section =
        document.getElementById(sectionId);

    if (section) {
        section.classList.add("active");
    }

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

    const container =
        document.getElementById("productContainer");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div style="padding:30px;text-align:center;">
            ⏳ Loading products...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API}/api/products`
            );

        const responseText =
            await response.text();

        let data;

        try {

            data =
                JSON.parse(responseText);

        } catch {

            throw new Error(
                "Backend returned an invalid response."
            );
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                `Could not load products. (${response.status})`
            );
        }

        allProducts =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(data.products)
                        ? data.products
                        : []
                );

        displayProducts(
            allProducts
        );

    } catch (error) {

        console.error(
            "Load products error:",
            error
        );

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:#dc2626;
            ">
                ❌ Could not load products.
                <br><br>
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ==================================================
// DISPLAY PRODUCTS
// ==================================================

function displayProducts(products) {

    const container =
        document.getElementById(
            "productContainer"
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
            ">
                🛍️ No products available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        products
            .map(product => {

                const name =
                    product.name ||
                    product.productName ||
                    "Unnamed Product";

                const seller =
                    product.seller ||
                    product.sellerName ||
                    "Unknown Seller";

                const marketPrice =
                    Number(
                        product.marketPrice || 0
                    );

                const sellingPrice =
                    Number(
                        product.sellingPrice || 0
                    );

                const saving =
                    Math.max(
                        0,
                        marketPrice -
                        sellingPrice
                    );

                const isSold =
                    product.available === false ||
                    product.status === "Sold";

                return `

                    <div
                        class="product-card"
                        style="
                            position:relative;
                            ${isSold ? "opacity:0.75;" : ""}
                        "
                    >

                        ${
                            isSold
                                ? `
                                    <span style="
                                        position:absolute;
                                        top:12px;
                                        right:12px;
                                        background:#dc2626;
                                        color:white;
                                        padding:6px 12px;
                                        border-radius:20px;
                                        font-weight:bold;
                                        font-size:12px;
                                    ">
                                        SOLD
                                    </span>
                                  `
                                : ""
                        }


                        <div class="product-image">
                            📚
                        </div>


                        <h3>
                            ${escapeHTML(name)}
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
                            ${escapeHTML(seller)}
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
                            saving > 0
                                ? `
                                    <p style="
                                        color:#15803d;
                                    ">
                                        💰 Save ₹${saving}
                                    </p>
                                  `
                                : ""
                        }


                        <div style="
                            display:flex;
                            gap:10px;
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
                                                    ${Number(product.id)}
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
                                        '${escapeJS(seller)}',
                                        '${escapeJS(name)}',
                                        ${Number(product.id)}
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

            })
            .join("");
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
            ? input.value
                .trim()
                .toLowerCase()
            : "";

    const selectedCategory =
        category
            ? category.value
            : "all";

    const filtered =
        allProducts.filter(
            product => {

                const productName =
                    String(
                        product.name ||
                        product.productName ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    productName.includes(
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
// SELL PRODUCT
// ==================================================

function setupSellProductForm() {

    const productForm =
        document.getElementById(
            "productForm"
        );

    if (!productForm) {
        return;
    }

    if (
        productForm.dataset
            .listenerAttached === "true"
    ) {
        return;
    }

    productForm.dataset
        .listenerAttached = "true";


    productForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const productNameInput =
                document.getElementById(
                    "productName"
                );

            const marketPriceInput =
                document.getElementById(
                    "marketPrice"
                );

            const sellingPriceInput =
                document.getElementById(
                    "sellingPrice"
                );

            const categoryInput =
                document.getElementById(
                    "category"
                );

            const sellerNameInput =
                document.getElementById(
                    "sellerName"
                );

            const sellerEmailInput =
                document.getElementById(
                    "sellerEmail"
                );

            const sellerUPIInput =
                document.getElementById(
                    "sellerUPI"
                );


            const productName =
                productNameInput
                    ? productNameInput.value.trim()
                    : "";

            const marketPrice =
                marketPriceInput
                    ? Number(
                        marketPriceInput.value
                    )
                    : 0;

            const sellingPrice =
                sellingPriceInput
                    ? Number(
                        sellingPriceInput.value
                    )
                    : 0;

            const category =
                categoryInput
                    ? categoryInput.value.trim()
                    : "";

            const sellerName =
                sellerNameInput
                    ? sellerNameInput.value.trim()
                    : "";

            const sellerEmail =
                sellerEmailInput
                    ? sellerEmailInput.value.trim()
                    : "";

            const sellerUPI =
                sellerUPIInput
                    ? sellerUPIInput.value.trim()
                    : "";


            // ------------------------------------------
            // VALIDATION
            // ------------------------------------------

            if (
                !productName ||
                !category ||
                !sellerName ||
                !sellerEmail ||
                !marketPrice ||
                !sellingPrice
            ) {

                alert(
                    "❌ Please fill all required fields."
                );

                return;
            }


            if (
                !Number.isFinite(
                    marketPrice
                ) ||
                marketPrice <= 0
            ) {

                alert(
                    "❌ Please enter a valid market price."
                );

                return;
            }


            if (
                !Number.isFinite(
                    sellingPrice
                ) ||
                sellingPrice <= 0
            ) {

                alert(
                    "❌ Please enter a valid selling price."
                );

                return;
            }


            if (
                sellingPrice >
                marketPrice
            ) {

                alert(
                    "❌ Selling price cannot be greater than market price."
                );

                return;
            }


            const submitButton =
                productForm.querySelector(
                    'button[type="submit"]'
                );


            try {

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "⏳ Listing Product...";
                }


                // ------------------------------------------
                // SEND PRODUCT TO BACKEND
                // ------------------------------------------

                const response =
                    await fetch(
                        `${API}/api/products`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

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

                                    sellerUPI:
                                        sellerUPI
                                })
                        }
                    );


                const responseText =
                    await response.text();


                let data = {};


                try {

                    data =
                        responseText
                            ? JSON.parse(
                                responseText
                            )
                            : {};

                } catch {

                    throw new Error(
                        "Backend returned an invalid response."
                    );
                }


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        `Product could not be added. (${response.status})`
                    );
                }


                // ------------------------------------------
                // SUCCESS
                // ------------------------------------------

                alert(
                    "✅ Product listed successfully!"
                );


                productForm.reset();


                // Get fresh products
                await loadProducts();


                // Open Available Products
                showSection(
                    "products"
                );


            } catch (error) {

                console.error(
                    "Product listing error:",
                    error
                );


                alert(
                    "❌ Product could not be listed.\n\n" +
                    (
                        error.message ||
                        "Please check the backend."
                    )
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "➕ List Product";
                }
            }
        }
    );
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

        alert(
            "❌ Product not found."
        );

        return;
    }


    if (
        selectedProduct.available ===
            false ||
        selectedProduct.status ===
            "Sold"
    ) {

        alert(
            "❌ This product has already been sold."
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
            "purchaseModal"
        );

    if (old) {
        old.remove();
    }


    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "purchaseModal";


    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.65);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        padding:20px;
    `;


    modal.innerHTML = `

        <div style="
            background:white;
            width:100%;
            max-width:450px;
            border-radius:18px;
            padding:28px;
        ">

            <h2 style="
                margin-top:0;
                color:#312e81;
            ">
                🛒 Purchase Product
            </h2>


            <p>
                <strong>Product:</strong>
                ${escapeHTML(
                    selectedProduct.name ||
                    selectedProduct.productName ||
                    ""
                )}
            </p>


            <p>
                <strong>Seller:</strong>
                ${escapeHTML(
                    selectedProduct.seller ||
                    selectedProduct.sellerName ||
                    ""
                )}
            </p>


            <p style="
                font-size:24px;
                color:#4f46e5;
                font-weight:bold;
            ">
                ₹${Number(
                    selectedProduct.sellingPrice ||
                    0
                ).toFixed(2)}
            </p>


            <input
                id="buyerEmail"
                type="email"
                placeholder="Your email"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    margin:8px 0;
                    border:1px solid #ddd;
                    border-radius:8px;
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
                    margin:8px 0;
                    border:1px solid #ddd;
                    border-radius:8px;
                "
            >


            <div style="
                display:flex;
                gap:10px;
                margin-top:18px;
            ">


                <button
                    id="paytmPayButton"
                    onclick="confirmPurchase()"
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
                    onclick="closePurchaseModal()"
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


function closePurchaseModal() {

    const modal =
        document.getElementById(
            "purchaseModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ==================================================
// LOAD PAYTM CHECKOUT SCRIPT
// ==================================================

function loadPaytmCheckoutScript(
    checkoutJsUrl
) {

    if (
        window.Paytm &&
        window.Paytm.CheckoutJS
    ) {

        return Promise.resolve();
    }


    if (paytmScriptPromise) {

        return paytmScriptPromise;
    }


    if (!checkoutJsUrl) {

        return Promise.reject(
            new Error(
                "Paytm Checkout URL is missing."
            )
        );
    }


    paytmScriptPromise =
        new Promise(
            (resolve, reject) => {

                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    checkoutJsUrl;

                script.async =
                    true;

                script.dataset.paytmCheckout =
                    "true";


                script.onload =
                    function() {

                        if (
                            !window.Paytm ||
                            !window.Paytm.CheckoutJS
                        ) {

                            reject(
                                new Error(
                                    "Paytm CheckoutJS could not be loaded."
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
                                "Paytm CheckoutJS could not be loaded."
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
            "❌ No product selected."
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


    const payButton =
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
            "❌ Please enter a valid email."
        );

        return;
    }


    if (
        !/^\d{10}$/.test(
            mobile
        )
    ) {

        alert(
            "❌ Please enter a valid 10-digit mobile number."
        );

        return;
    }


    try {

        if (payButton) {

            payButton.disabled =
                true;

            payButton.textContent =
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


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            throw new Error(
                `Server returned an invalid response. Status ${response.status}`
            );
        }


        if (
            !response.ok ||
            data.success === false
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

            root:
                "",

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


                        if (
                            eventName ===
                            "APP_CLOSED"
                        ) {

                            alert(
                                "Payment cancelled."
                            );
                        }


                        if (
                            eventName ===
                            "SESSION_EXPIRED"
                        ) {

                            alert(
                                "Payment session expired. Please try again."
                            );
                        }
                    },


                transactionStatus:
                    function(
                        paymentData
                    ) {

                        console.log(
                            "Paytm transaction response:",
                            paymentData
                        );


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

                            if (
                                window.Paytm &&
                                window.Paytm.CheckoutJS
                            ) {

                                window.Paytm.CheckoutJS.close();
                            }


                            alert(
                                "✅ Payment received. Verifying transaction..."
                            );


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

                            if (
                                window.Paytm &&
                                window.Paytm.CheckoutJS
                            ) {

                                window.Paytm.CheckoutJS.close();
                            }


                            alert(
                                "⏳ Payment is pending. Please check Transaction History later."
                            );


                            reconcilePaytmOrder(
                                orderId
                            );


                            return;
                        }


                        if (
                            window.Paytm &&
                            window.Paytm.CheckoutJS
                        ) {

                            window.Paytm.CheckoutJS.close();
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


        if (payButton) {

            payButton.disabled =
                false;

            payButton.textContent =
                "💳 Continue to Paytm";
        }
    }
}


// ==================================================
// VERIFY PAYTM PAYMENT
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


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            throw new Error(
                "Backend returned an invalid verification response."
            );
        }


        if (
            data.success &&
            data.transaction
        ) {

            paytmHandledOrders.add(
                orderId
            );


            if (selectedProduct) {

                selectedProduct.available =
                    false;

                selectedProduct.status =
                    "Sold";
            }


            closePurchaseModal();


            await loadProducts();


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
                "⏳ Payment is still pending. Check Transaction History later."
            );

            return;
        }


        throw new Error(
            data.message ||
            "Payment verification failed."
        );


    } catch (error) {

        console.error(
            "Paytm verification error:",
            error
        );


        alert(
            "❌ " +
            (
                error.message ||
                "Payment verification failed."
            )
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
            "successModal"
        );


    if (old) {
        old.remove();
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "successModal";


    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.65);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:10000;
        padding:20px;
    `;


    modal.innerHTML = `

        <div style="
            background:white;
            width:100%;
            max-width:470px;
            border-radius:18px;
            padding:30px;
        ">

            <div style="
                text-align:center;
                font-size:50px;
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
                📚
                <strong>Product:</strong>
                ${escapeHTML(
                    transaction.productName
                )}
            </p>


            <p>
                💰
                <strong>Amount:</strong>
                ₹${escapeHTML(
                    transaction.amount
                )}
            </p>


            <p>
                👤
                <strong>Seller:</strong>
                ${escapeHTML(
                    transaction.seller
                )}
            </p>


            <p>
                🆔
                <strong>Transaction ID:</strong>
                #${escapeHTML(
                    transaction.id
                )}
            </p>


            <p>
                💳
                <strong>Payment:</strong>
                Paytm
            </p>


            <p>
                ✅
                <strong>Status:</strong>
                Completed
            </p>


            <button
                onclick="closeSuccess()"
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

    selectedSeller =
        seller;

    selectedProductName =
        productName;

    selectedProductId =
        productId;


    const old =
        document.getElementById(
            "messageModal"
        );


    if (old) {
        old.remove();
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "messageModal";


    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.65);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        padding:20px;
    `;


    modal.innerHTML = `

        <div style="
            background:white;
            width:100%;
            max-width:500px;
            border-radius:18px;
            padding:28px;
        ">

            <h2 style="
                color:#312e81;
                margin-top:0;
            ">
                💬 Message Seller
            </h2>


            <p>
                📚
                <strong>
                    ${escapeHTML(
                        productName
                    )}
                </strong>
            </p>


            <p>
                👤 Seller:
                ${escapeHTML(
                    seller
                )}
            </p>


            <input
                id="senderEmail"
                type="email"
                placeholder="Your email"
                value="${escapeHTML(
                    getCurrentUserEmail()
                )}"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    margin:8px 0;
                    border:1px solid #ddd;
                    border-radius:8px;
                "
            >


            <textarea
                id="messageText"
                rows="5"
                placeholder="Write your message..."
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    margin:8px 0;
                    border:1px solid #ddd;
                    border-radius:8px;
                    resize:none;
                "
            ></textarea>


            <div style="
                display:flex;
                gap:10px;
                margin-top:15px;
            ">


                <button
                    onclick="sendMessage()"
                    style="
                        flex:1;
                        padding:12px;
                        border:none;
                        border-radius:8px;
                        background:#4f46e5;
                        color:white;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    📤 Send Message
                </button>


                <button
                    onclick="closeMessageModal()"
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
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    const senderInput =
        document.getElementById(
            "senderEmail"
        );


    const messageInput =
        document.getElementById(
            "messageText"
        );


    const sender =
        senderInput
            ? senderInput.value.trim()
            : "";


    const message =
        messageInput
            ? messageInput.value.trim()
            : "";


    if (
        !sender ||
        !sender.includes("@")
    ) {

        alert(
            "❌ Please enter a valid email."
        );

        return;
    }


    if (!message) {

        alert(
            "❌ Please write a message."
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

                            sender:
                                sender,

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


        const responseText =
            await response.text();


        let data = {};


        try {

            data =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : {};

        } catch {

            throw new Error(
                "Backend returned an invalid response."
            );
        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Message could not be sent."
            );
        }


        alert(
            "✅ Message sent successfully!"
        );


        closeMessageModal();


        loadMessages();


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );


        alert(
            "❌ " +
            (
                error.message ||
                "Message could not be sent."
            )
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


        const responseText =
            await response.text();


        let messages;


        try {

            messages =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : [];

        } catch {

            throw new Error(
                "Backend returned an invalid message response."
            );
        }


        if (!response.ok) {

            throw new Error(
                messages.message ||
                "Messages could not be loaded."
            );
        }


        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            container.innerHTML = `
                <div style="
                    background:white;
                    padding:30px;
                    text-align:center;
                    border-radius:15px;
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
                    msg => `

                        <div style="
                            background:white;
                            padding:20px;
                            margin-bottom:15px;
                            border-radius:15px;
                            box-shadow:
                                0 4px 15px
                                rgba(0,0,0,0.08);
                        ">


                            <h3 style="
                                color:#312e81;
                            ">
                                📚
                                ${escapeHTML(
                                    msg.productName ||
                                    msg.product ||
                                    "Product"
                                )}
                            </h3>


                            <p>
                                📤
                                <strong>From:</strong>
                                ${escapeHTML(
                                    msg.sender || ""
                                )}
                            </p>


                            <p>
                                📥
                                <strong>To:</strong>
                                ${escapeHTML(
                                    msg.receiver || ""
                                )}
                            </p>


                            <div style="
                                background:#f3f4f6;
                                padding:15px;
                                border-radius:10px;
                                margin:12px 0;
                            ">
                                ${escapeHTML(
                                    msg.message || ""
                                )}
                            </div>


                            <small style="
                                color:#6b7280;
                            ">
                                ${escapeHTML(
                                    msg.date || ""
                                )}
                            </small>


                            <br>
                            <br>


                            <button
                                onclick="
                                    replyMessage(
                                        '${escapeJS(
                                            msg.sender || ""
                                        )}',
                                        ${msg.id || 0},
                                        '${escapeJS(
                                            msg.productName ||
                                            msg.product ||
                                            "Product"
                                        )}',
                                        ${msg.productId || "null"}
                                    )
                                "
                                style="
                                    padding:9px 16px;
                                    border:none;
                                    border-radius:8px;
                                    background:#4f46e5;
                                    color:white;
                                    cursor:pointer;
                                "
                            >
                                ↩️ Reply
                            </button>


                        </div>

                    `
                )
                .join("");


    } catch (error) {

        console.error(
            "Load messages error:",
            error
        );


        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:#dc2626;
            ">
                ❌ Could not load messages.
                <br><br>
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;
    }
}


// ==================================================
// REPLY MESSAGE
// ==================================================

function replyMessage(
    receiver,
    messageId,
    productName,
    productId
) {

    selectedSeller =
        receiver;

    selectedProductName =
        productName;

    selectedProductId =
        productId;


    openMessageBox(
        receiver,
        productName,
        productId
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
// PAYTM RETURN HANDLER
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
// START WEBSITE
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        setupSellProductForm();

        loadProducts();

        loadMessages();

        handlePaytmReturn();
    }
);
