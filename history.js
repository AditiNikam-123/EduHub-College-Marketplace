const buyer = localStorage.getItem("userEmail");

const transactionList =
    document.getElementById("transactionList");


if (!buyer) {

    transactionList.innerHTML = `
        <div class="empty-message">
            <h2>🔐 Login Required</h2>
            <p>Please login to view your transaction history.</p>
            <a href="login.html">Login</a>
        </div>
    `;

} else {

    fetch(`http://localhost:5000/transactions/${buyer}`)

        .then(response => response.json())

        .then(transactions => {

            if (transactions.length === 0) {

                transactionList.innerHTML = `
                    <div class="empty-message">
                        <h2>🛍️ No Transactions Yet</h2>
                        <p>
                            Your purchases will appear here.
                        </p>
                        <a href="index.html">
                            Explore Marketplace
                        </a>
                    </div>
                `;

                return;
            }


            transactionList.innerHTML = "";


            transactions.reverse().forEach(transaction => {

                const card =
                    document.createElement("div");

                card.className =
                    "transaction-card";


                card.innerHTML = `

                    <h3>
                        📦 ${transaction.product}
                    </h3>

                    <p class="transaction-info">
                        <strong>💰 Amount:</strong>
                        ₹${transaction.amount}
                    </p>

                    <p class="transaction-info">
                        <strong>📅 Date:</strong>
                        ${transaction.date}
                    </p>

                    <p class="transaction-info">
                        <strong>📌 Status:</strong>
                        <span class="status">
                            ✓ ${transaction.status}
                        </span>
                    </p>

                    <p class="transaction-id">
                        Transaction ID: ${transaction.id}
                    </p>

                `;


                transactionList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            transactionList.innerHTML = `
                <div class="empty-message">
                    <h2>⚠️ Unable to Load</h2>
                    <p>
                        We couldn't load your transaction history.
                    </p>
                </div>
            `;

        });

}