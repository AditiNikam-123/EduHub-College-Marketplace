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

function showSection(sectionId) {

    document
        .querySelectorAll(".section")
        .forEach(section => {

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


        allProducts =
            await response.json();


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
                color:red;
            ">
                ❌ Backend connection failed.

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
                🛍️ No products found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        products
            .map(product => {

                const sold =
                    product.available === false ||
                    product.status === "Sold";


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


                const productName =
                    product.name ||
                    product.productName ||
                    "Product";


                const seller =
                    product.seller ||
                    product.sellerName ||
                    "Seller";


                return `

                    <div
                        class="product-card"
                        style="
                            position:relative;
                            ${
                                sold
                                    ? "opacity:0.70;"
                                    : ""
                            }
                        "
                    >

                        ${
                            sold
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
                            !sold
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
                                sold
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
                                    onclick="buyProduct(
                                        ${Number(product.id)}
                                    )"
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
                                        '${escapeJS(productName)}',
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
        selectedProduct.available === false ||
        selectedProduct.status === "Sold"
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
            "purchaseModal"
        );


    if (old) {

        old.remove();

    }


    const productName =
        selectedProduct.name ||
        selectedProduct.productName ||
        "Product";


    const seller =
        selectedProduct.seller ||
        selectedProduct.sellerName ||
        "Seller";


    const price =
        Number(
            selectedProduct.sellingPrice || 0
        );


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "purchaseModal";


    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.70);
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
                margin-top:0;
                color:#312e81;
            ">

                🛒 Buy Product

            </h2>


            <p>

                <strong>
                    Product:
                </strong>

                ${escapeHTML(
                    productName
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
                font-size:25px;
                font-weight:bold;
                color:#4f46e5;
            ">

                ₹${price}

            </p>


            <hr>


            <label style="
                display:block;
                margin:12px 0 6px;
                font-weight:bold;
            ">

                Buyer Email

            </label>


            <input
                id="buyerEmail"
                type="email"
                placeholder="Enter your email"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border:1px solid #d1d5db;
                    border-radius:8px;
                "
            >


            <p style="
                font-size:13px;
                color:#6b7280;
                margin-top:10px;
            ">

                🔒 Secure payment will open in
                Razorpay Checkout.

            </p>


            <div style="
                display:flex;
                gap:10px;
                margin-top:20px;
            ">


                <button
                    onclick="startPayment()"
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

                    💳 Pay Now

                </button>


                <button
                    onclick="closePurchaseModal()"
                    style="
                        flex:1;
                        padding:12px;
                        border:none;
                        border-radius:8px;
                        background:#e5e7eb;
                        color:#111827;
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
// START REAL PAYMENT
// ==================================================

async function startPayment() {

    if (!selectedProduct) {

        alert(
            "❌ No product selected."
        );

        return;
    }


    if (
        typeof Razorpay ===
        "undefined"
    ) {

        alert(
            "❌ Razorpay Checkout could not load."
        );

        return;
    }


    const emailInput =
        document.getElementById(
            "buyerEmail"
        );


    if (!emailInput) {

        alert(
            "❌ Buyer email field not found."
        );

        return;
    }


    const buyerEmail =
        emailInput.value.trim();


    if (
        !buyerEmail ||
        !buyerEmail.includes("@")
    ) {

        alert(
            "❌ Please enter a valid email."
        );

        return;
    }


    try {

        const orderResponse =
            await fetch(
                `${API}/api/payment/create-order`,
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
                                buyerEmail

                        })

                }
            );


        const orderData =
            await orderResponse.json();


        if (!orderResponse.ok) {

            alert(
                "❌ " +
                (
                    orderData.message ||
                    "Could not create payment order."
                )
            );

            return;
        }


        closePurchaseModal();


        const options = {

            key:
                orderData.key,


            amount:
                orderData.order.amount,


            currency:
                orderData.order.currency,


            name:
                "EduHub",


            description:
                orderData.product.name,


            order_id:
                orderData.order.id,


            prefill: {

                email:
                    buyerEmail

            },


            notes: {

                productId:
                    String(
                        selectedProduct.id
                    )

            },


            theme: {

                color:
                    "#4f46e5"

            },


            handler:
                async function(
                    response
                ) {

                    await verifyPayment(
                        response,
                        buyerEmail
                    );

                },


            modal: {

                ondismiss:
                    function() {

                        console.log(
                            "Payment window closed."
                        );

                    }

            }

        };


        const paymentObject =
            new Razorpay(
                options
            );


        paymentObject.on(
            "payment.failed",
            function(response) {

                console.error(
                    "Payment failed:",
                    response.error
                );


                alert(
                    "❌ Payment failed. Please try again."
                );

            }
        );


        paymentObject.open();


    } catch (error) {

        console.error(
            "Start payment error:",
            error
        );


        alert(
            "❌ Could not connect to payment server."
        );
    }
}


// ==================================================
// VERIFY PAYMENT
// ==================================================

async function verifyPayment(
    paymentResponse,
    buyerEmail
) {

    if (!selectedProduct) {

        alert(
            "❌ Product information is missing."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API}/api/payment/verify`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            razorpay_order_id:
                                paymentResponse
                                    .razorpay_order_id,

                            razorpay_payment_id:
                                paymentResponse
                                    .razorpay_payment_id,

                            razorpay_signature:
                                paymentResponse
                                    .razorpay_signature,

                            productId:
                                selectedProduct.id,

                            buyerEmail:
                                buyerEmail

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
                    "Payment verification failed."
                )
            );

            return;
        }


        selectedProduct.available =
            false;


        selectedProduct.status =
            "Sold";


        displayProducts(
            allProducts
        );


        showPurchaseSuccess(
            data.transaction
        );


    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        alert(
            "❌ Payment completed, but verification could not be completed. Please contact the administrator."
        );
    }
}


// ==================================================
// SUCCESS MESSAGE
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
        background:rgba(0,0,0,0.70);
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

                Payment Successful!

            </h2>


            <p style="
                text-align:center;
                color:#6b7280;
            ">

                Your payment has been
                verified successfully.

            </p>


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

                ₹${transaction.amount}

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

                💳
                <strong>
                    Payment ID:
                </strong>

                ${escapeHTML(
                    transaction.paymentId
                )}

            </p>


            <p>

                🆔
                <strong>
                    Transaction ID:
                </strong>

                #${transaction.id}

            </p>


            <p>

                📌
                <strong>
                    Status:
                </strong>

                <span style="
                    color:#15803d;
                    font-weight:bold;
                ">

                    Paid / Completed

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
// MESSAGES
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


function closeMessageModal() {

    const modal =
        document.getElementById(
            "messageModal"
        );


    if (modal) {

        modal.remove();

    }
}


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
            "❌ Message box not found."
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

                    <div style="
                        font-size:45px;
                    ">

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


        container.innerHTML =
            [...messages]
                .reverse()
                .map(message => {

                    const productName =
                        message.productName ||
                        message.product ||
                        "Marketplace Product";


                    const sender =
                        message.sender ||
                        "Unknown";


                    const receiver =
                        message.receiver ||
                        "Unknown";


                    const text =
                        message.message ||
                        "";


                    const date =
                        message.date ||
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

                            <h3 style="
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
                                    text
                                )}

                            </div>


                            <p style="
                                font-size:12px;
                                color:#6b7280;
                            ">

                                ${escapeHTML(
                                    date
                                )}

                            </p>


                            <button
                                onclick="
                                    replyMessage(
                                        '${escapeJS(sender)}',
                                        ${message.id || 0},
                                        '${escapeJS(productName)}',
                                        ${message.productId || "null"}
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

                })
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
        ?
        input.value
            .toLowerCase()
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

                const name =
                    String(
                        product.name ||
                        product.productName ||
                        ""
                    )
                        .toLowerCase();


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
// SELL PRODUCT
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const productForm =
            document.getElementById(
                "productForm"
            );


        if (productForm) {

            productForm.addEventListener(
                "submit",
                submitProduct
            );

        }


        loadProducts();

        loadMessages();

    }
);


async function submitProduct(event) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "productName"
            )
            .value
            .trim();


    const marketPrice =
        Number(
            document
                .getElementById(
                    "marketPrice"
                )
                .value
        );


    const sellingPrice =
        Number(
            document
                .getElementById(
                    "sellingPrice"
                )
                .value
        );


    const category =
        document
            .getElementById(
                "category"
            )
            .value;


    const seller =
        document
            .getElementById(
                "sellerName"
            )
            .value
            .trim();


    const sellerEmail =
        document
            .getElementById(
                "sellerEmail"
            )
            .value
            .trim();


    if (
        !name ||
        !marketPrice ||
        !sellingPrice ||
        !category ||
        !seller ||
        !sellerEmail
    ) {

        alert(
            "❌ Please fill all fields."
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
                        JSON.stringify({

                            name:
                                name,

                            marketPrice:
                                marketPrice,

                            sellingPrice:
                                sellingPrice,

                            category:
                                category,

                            seller:
                                seller,

                            sellerEmail:
                                sellerEmail

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


        const productForm =
            document.getElementById(
                "productForm"
            );


        if (productForm) {

            productForm.reset();

        }


        await loadProducts();


        showSection(
            "products"
        );


    } catch (error) {

        console.error(
            "Product listing error:",
            error
        );


        alert(
            "❌ Could not connect to the backend."
        );
    }
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
// ESCAPE JS
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
