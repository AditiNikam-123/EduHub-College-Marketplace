// ==================================================
// EDuhub - College Marketplace
// ==================================================

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
        document.getElementById(
            "productContainer"
        );

    if (!container) return;

    container.innerHTML = `
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

        const data =
            await response.json();

        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid products response"
            );

        }

        allProducts = data;

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
                ❌ Unable to load products.

                <br><br>

                Please check that the backend
                is running correctly.
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

    if (!container) return;

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

                const isSold =
                    product.available === false;

                const productName =
                    product.name ||
                    product.productName ||
                    "Product";

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
                    marketPrice -
                    sellingPrice;


                return `

                    <div
                        class="product-card"
                        style="
                            position:relative;
                            ${isSold
                                ? "opacity:0.72;"
                                : ""}
                        "
                    >

                        ${
                            isSold
                            ?
                            `
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
                            :
                            ""
                        }


                        <div class="product-image">

                            ${
                                product.image
                                ?
                                `
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
                                :
                                `
                                📚
                                `
                            }

                        </div>


                        <h3>
                            ${escapeHTML(
                                productName
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
                            ?
                            `
                            <p style="
                                color:#15803d;
                            ">
                                💰 Save ₹${saving}
                            </p>
                            `
                            :
                            `
                            <p style="
                                color:#dc2626;
                                font-weight:bold;
                            ">
                                This product has
                                been sold.
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
                                ?
                                `
                                <button
                                    disabled
                                    style="
                                        flex:1;
                                        padding:11px;
                                        border:none;
                                        border-radius:8px;
                                        background:#9ca3af;
                                        color:white;
                                        cursor:not-allowed;
                                    "
                                >
                                    🔴 Sold Out
                                </button>
                                `
                                :
                                `
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
                                            productName
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

            })
            .join("");
}


// ==================================================
// PAYTM PAYMENT
// ==================================================

let paytmScriptPromise = null;

let paytmHandledOrders =
    new Set();


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


    paytmScriptPromise =
        new Promise(
            (resolve, reject) => {

                const existingScript =
                    document.querySelector(
                        'script[data-paytm-checkout="true"]'
                    );


                if (existingScript) {

                    existingScript.addEventListener(
                        "load",
                        () => {

                            if (
                                window.Paytm &&
                                window.Paytm.CheckoutJS
                            ) {

                                window.Paytm.CheckoutJS.onLoad(
                                    () => resolve()
                                );

                            } else {

                                reject(
                                    new Error(
                                        "Paytm CheckoutJS did not load."
                                    )
                                );

                            }
                        }
                    );


                    existingScript.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "Paytm CheckoutJS could not load."
                                )
                            );

                        }
                    );

                    return;
                }


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
                                    "Paytm CheckoutJS is unavailable."
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
            padding:30px;
            box-shadow:
                0 20px 50px
                rgba(0,0,0,0.25);
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
                    selectedProduct.productName ||
                    "Product"
                )}
            </p>


            <p>
                <strong>
                    Seller:
                </strong>

                ${escapeHTML(
                    selectedProduct.seller ||
                    selectedProduct.sellerName ||
                    "Seller"
                )}
            </p>


            <p style="
                font-size:24px;
                font-weight:bold;
                color:#4f46e5;
            ">
                ₹${Number(
                    selectedProduct.sellingPrice ||
                    0
                ).toFixed(2)}
            </p>


            <hr>


            <p style="
                color:#4b5563;
            ">
                Enter your details to continue
                to the Paytm checkout.
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

    const payButton =
        document.getElementById(
            "paytmPayButton"
        );


    if (
        !emailInput ||
        !mobileInput
    ) {

        alert(
            "Buyer fields not found."
        );

        return;
    }


    const buyer =
        emailInput.value.trim();

    const mobile =
        mobileInput.value.trim();


    if (!buyer) {

        alert(
            "Please enter your email."
        );

        return;
    }


    if (!buyer.includes("@")) {

        alert(
            "Please enter a valid email."
        );

        return;
    }


    if (!/^\d{10}$/.test(mobile)) {

        alert(
            "Please enter a valid 10-digit mobile number."
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

                    body: JSON.stringify({

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

            flow: "DEFAULT",

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
                redirect: true
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
                            ?
                            paymentData.ORDERID
                            :
                            data.orderId;


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
                            )
                            .catch(
                                error => {

                                    console.error(
                                        "Paytm reconciliation error:",
                                        error
                                    );

                                }
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
                                "⏳ Payment is pending. We will confirm it with Paytm."
                            );


                            reconcilePaytmOrder(
                                orderId
                            )
                            .catch(
                                error => {

                                    console.error(
                                        "Paytm pending check error:",
                                        error
                                    );

                                }
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
                            "❌ Payment failed or was cancelled. Please try again."
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
// PAYTM VERIFICATION
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

                    body: JSON.stringify({
                        orderId:
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


            if (selectedProduct) {

                selectedProduct.available =
                    false;

                selectedProduct.status =
                    "Sold";

            }


            closePurchaseModal();

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
                "⏳ Paytm has not confirmed the payment yet. Please check Transaction History after a little while."
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
            "Paytm verification error:",
            error
        );


        alert(
            "❌ Payment completed, but verification could not be reached right now. Please check Transaction History shortly."
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
                💳
                <strong>
                    Payment:
                </strong>

                Paytm
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


// ==================================================
// CLOSE PURCHASE
// ==================================================

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
// CLOSE SUCCESS
// ==================================================

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
// SELL PRODUCT
// ==================================================

const productForm =
    document.getElementById(
        "productForm"
    );


if (productForm) {

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

            const sellerPaytmMidInput =
                document.getElementById(
                    "sellerPaytmMid"
                );


            if (
                !productNameInput ||
                !marketPriceInput ||
                !sellingPriceInput ||
                !categoryInput ||
                !sellerNameInput ||
                !sellerEmailInput
            ) {

                alert(
                    "❌ Product form fields are missing."
                );

                return;
            }


            const productName =
                productNameInput.value.trim();

            const marketPrice =
                Number(
                    marketPriceInput.value
                );

            const sellingPrice =
                Number(
                    sellingPriceInput.value
                );

            const category =
                categoryInput.value;

            const sellerName =
                sellerNameInput.value.trim();

            const sellerEmail =
                sellerEmailInput.value.trim();

            const sellerPaytmMid =
                sellerPaytmMidInput
                ?
                sellerPaytmMidInput
                    .value
                    .trim()
                :
                "";


            // ----------------------------
            // VALIDATION
            // ----------------------------

            if (!productName) {

                alert(
                    "Please enter the product name."
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
                    "Please enter a valid market price."
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
                    "Please enter a valid selling price."
                );

                return;
            }


            if (!category) {

                alert(
                    "Please select a category."
                );

                return;
            }


            if (!sellerName) {

                alert(
                    "Please enter your name."
                );

                return;
            }


            if (
                !sellerEmail ||
                !sellerEmail.includes("@")
            ) {

                alert(
                    "Please enter a valid college email."
                );

                return;
            }


            // ----------------------------
            // CREATE PRODUCT OBJECT
            // ----------------------------

            const product = {

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
                    true

            };


            console.log(
                "Sending product:",
                product
            );


            try {

                const response =
                    await fetch(
                        `${API}/api/products`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    product
                                )
                        }
                    );


                let data = {};


                try {

                    data =
                        await response.json();

                } catch {

                    data = {};

                }


                console.log(
                    "Add product response:",
                    data
                );


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Product could not be added."
                    );

                }


                alert(
                    "✅ Product listed successfully!"
                );


                // Clear form
                productForm.reset();


                // Reload latest products
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
                    "❌ " +
                    (
                        error.message ||
                        "Could not list product."
                    )
                );

            }

        }
    );

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
            padding:30px;
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
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    margin:10px 0;
                "
            >


            <textarea
                id="messageText"
                placeholder="Write your message..."
                rows="5"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
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


    if (
        !senderInput ||
        !messageInput
    ) {

        alert(
            "Message box not found."
        );

        return;
    }


    const sender =
        senderInput.value.trim();

    const message =
        messageInput.value.trim();


    if (!sender) {

        alert(
            "Please enter your email."
        );

        return;
    }


    if (!sender.includes("@")) {

        alert(
            "Please enter a valid email."
        );

        return;
    }


    if (!message) {

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


        loadMessages();


    } catch (error) {

        console.error(
            "Message error:",
            error
        );


        alert(
            "❌ Cannot connect to backend."
        );
    }
}


// ==================================================
// CLOSE MESSAGE MODAL
// ==================================================

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


        if (!response.ok) {

            throw new Error(
                "Messages failed"
            );

        }


        const messages =
            await response.json();


        console.log(
            "Messages received:",
            messages
        );


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
                    box-shadow:
                        0 4px 15px
                        rgba(0,0,0,0.08);
                ">

                    <div style="
                        font-size:45px;
                    ">
                        💬
                    </div>

                    <h3>
                        No messages yet
                    </h3>

                    <p>
                        Messages sent from the
                        marketplace will appear here.
                    </p>

                </div>
            `;

            return;
        }


        const sortedMessages =
            [...messages].reverse();


        container.innerHTML =
            sortedMessages
                .map(
                    msg => {

                        const productName =
                            msg.productName ||
                            msg.product ||
                            "Marketplace Product";


                        const messageText =
                            msg.message ||
                            "";


                        const sender =
                            msg.sender ||
                            "Unknown";


                        const receiver =
                            msg.receiver ||
                            "Unknown";


                        const date =
                            msg.date ||
                            "";


                        return `

                            <div style="
                                background:white;
                                padding:20px;
                                margin-bottom:15px;
                                border-radius:15px;
                                box-shadow:
                                    0 4px 15px
                                    rgba(0,0,0,0.08);
                            ">

                                <div style="
                                    display:flex;
                                    justify-content:space-between;
                                    align-items:center;
                                    gap:10px;
                                    margin-bottom:10px;
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


                                    <span style="
                                        font-size:12px;
                                        color:#6b7280;
                                    ">
                                        ${escapeHTML(
                                            date
                                        )}
                                    </span>

                                </div>


                                <p>
                                    📤
                                    <strong>
                                        From:
                                    </strong>

                                    ${escapeHTML(
                                        sender
                                    )}
                                </p>


                                <p>
                                    📥
                                    <strong>
                                        To:
                                    </strong>

                                    ${escapeHTML(
                                        receiver
                                    )}
                                </p>


                                <div style="
                                    background:#f3f4f6;
                                    padding:15px;
                                    border-radius:10px;
                                    margin:12px 0;
                                ">

                                    💬
                                    ${escapeHTML(
                                        messageText
                                    )}

                                </div>


                                <button
                                    onclick="
                                        replyMessage(
                                            '${escapeJS(
                                                sender
                                            )}',
                                            ${Number(
                                                msg.id || 0
                                            )},
                                            '${escapeJS(
                                                productName
                                            )}',
                                            ${Number(
                                                msg.productId || 0
                                            )}
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
            "Load messages error:",
            error
        );


        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:#dc2626;
            ">

                ❌ Unable to load messages.

                <br><br>

                Please check the backend.

            </div>
        `;
    }
}


// ==================================================
// REPLY TO MESSAGE
// ==================================================

async function replyMessage(
    receiver,
    messageId,
    productName,
    productId
) {

    const sender =
        prompt(
            "Enter your email:"
        );


    if (!sender) {
        return;
    }


    if (!sender.includes("@")) {

        alert(
            "Please enter a valid email."
        );

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

                            sender:
                                sender,

                            receiver:
                                receiver,

                            productId:
                                productId,

                            productName:
                                productName,

                            message:
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
                data.message ||
                "Reply failed."
            );

            return;
        }


        alert(
            "✅ Reply sent!"
        );


        loadMessages();


    } catch (error) {

        console.error(
            "Reply error:",
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
        ?
        input.value
            .toLowerCase()
            .trim()
        :
        "";


    const selectedCategory =
        category
        ?
        category.value
        :
        "all";


    const filtered =
        allProducts.filter(
            product => {

                const productName =
                    String(
                        product.name ||
                        product.productName ||
                        ""
                    )
                    .toLowerCase();


                const categoryName =
                    String(
                        product.category ||
                        ""
                    );


                const matchesSearch =
                    productName.includes(
                        search
                    );


                const matchesCategory =
                    selectedCategory ===
                    "all" ||
                    categoryName ===
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


// ==================================================
// FILTER CATEGORY
// ==================================================

function filterCategory() {

    searchProducts();

}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHTML(value) {

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
// ESCAPE JAVASCRIPT
// ==================================================

function escapeJS(value) {

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
        )

        .replace(
            /\r/g,
            "\\r"
        )

        .replace(
            /\n/g,
            "\\n"
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

    localStorage.removeItem(
        "currentUser"
    );

    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


// ==================================================
// PAYTM RETURN URL HANDLER
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

        loadProducts();

        loadMessages();

        handlePaytmReturn();

    }
);
