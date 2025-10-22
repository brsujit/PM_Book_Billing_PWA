// --- APP STATE ---
let books = [], customers = [], billItems = [], nextItemId = 1, invoiceCounter = 1;

// --- DOM ELEMENT DECLARATIONS ---
let bookTitleDropdown, bookAuthorDropdown, bookCodeInput, bookQtyInput, bookPriceInput, bookDiscountInput, addItemBtn, taxRateInput, globalDiscountInput, customerNameInput, customerPhoneInput, countryCodeInput, customerAddressInput, updateBtn, clearBtn, toastEl, paymentMethodInput, amountPaidInput, balanceDueDisplay, pssContainer, pssButton, pssDropdown, printBtn, whatsappBtn, exportBtn, billItemsContainer, emptyBillMsg, invoiceCustomerName, invoiceCustomerAddress, invoiceNo, invoiceDate, subtotalEl, itemDiscountsTotalEl, globalDiscountLabelEl, globalDiscountTotalEl, taxLabelEl, taxTotalEl, grandTotalEl, invoicePaymentSummary, invoicePaymentMethod, invoiceAmountPaid, invoiceBalanceDue, customerList;

async function initializeAppLogic() {
    // Assign DOM elements
    bookTitleDropdown = document.getElementById('book-title-dropdown');
    bookAuthorDropdown = document.getElementById('book-author-dropdown');
    bookCodeInput = document.getElementById('book-code');
    bookQtyInput = document.getElementById('book-qty');
    bookPriceInput = document.getElementById('book-price');
    bookDiscountInput = document.getElementById('book-discount');
    addItemBtn = document.getElementById('add-item-btn');
    taxRateInput = document.getElementById('tax-rate');
    globalDiscountInput = document.getElementById('global-discount');
    customerNameInput = document.getElementById('customer-name');
    countryCodeInput = document.getElementById('country-code'); 
    customerAddressInput = document.getElementById('customer-address'); 
    updateBtn = document.getElementById('update-btn');
    clearBtn = document.getElementById('clear-btn');
    toastEl = document.getElementById('toast');
    customerPhoneInput = document.getElementById('phone-number-input'); 
    paymentMethodInput = document.getElementById('payment-method');
    amountPaidInput = document.getElementById('amount-paid');
    balanceDueDisplay = document.getElementById('balance-due-display');
    pssContainer = document.getElementById('pss-container');
    pssButton = document.getElementById('pss-button');
    pssDropdown = document.getElementById('pss-dropdown');
    printBtn = document.getElementById('print-btn');
    whatsappBtn = document.getElementById('whatsapp-btn');
    exportBtn = document.getElementById('export-btn');
    billItemsContainer = document.getElementById('bill-items');
    emptyBillMsg = document.getElementById('empty-bill-msg');
    invoiceCustomerName = document.getElementById('invoice-customer-name');
    invoiceCustomerAddress = document.getElementById('invoice-customer-address'); 
    invoiceNo = document.getElementById('invoice-no');
    invoiceDate = document.getElementById('invoice-date');
    subtotalEl = document.getElementById('subtotal');
    itemDiscountsTotalEl = document.getElementById('item-discounts-total');
    globalDiscountLabelEl = document.getElementById('global-discount-label');
    globalDiscountTotalEl = document.getElementById('global-discount-total');
    taxLabelEl = document.getElementById('tax-label');
    taxTotalEl = document.getElementById('tax-total');
    grandTotalEl = document.getElementById('grand-total');
    invoicePaymentSummary = document.getElementById('invoice-payment-summary');
    invoicePaymentMethod = document.getElementById('invoice-payment-method');
    invoiceAmountPaid = document.getElementById('invoice-amount-paid');
    invoiceBalanceDue = document.getElementById('invoice-balance-due');
    customerList = document.getElementById('customer-list');

    await fetchBooksAndInitialize();
    await fetchCustomersAndInitialize();
    await initializeInvoiceCounter();
    updateBill();
    lucide.createIcons();
    
    // Attach Listeners
    if (pssButton) {
        pssButton.addEventListener('click', () => pssDropdown.classList.toggle('hidden'));
        window.addEventListener('click', (e) => { 
            if (pssContainer && !pssContainer.contains(e.target)) pssDropdown.classList.add('hidden');
        });
        printBtn.addEventListener('click', (e) => { e.preventDefault(); logAndPrint(); pssDropdown.classList.add('hidden'); });
        whatsappBtn.addEventListener('click', (e) => { e.preventDefault(); sendBillToWhatsApp(); pssDropdown.classList.add('hidden'); });
        exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportHistoryToExcel(); pssDropdown.classList.add('hidden'); });
    }
    bookTitleDropdown.addEventListener('change', handleBookSelection);
    bookAuthorDropdown.addEventListener('change', handleAuthorSelection);
    addItemBtn.addEventListener('click', addItemToBill);
    updateBtn.addEventListener('click', updateBill);
    clearBtn.addEventListener('click', () => { if (confirm('Are you sure?')) clearBill(true); });
    customerNameInput.addEventListener('input', handleCustomerSelection);
    customerAddressInput.addEventListener('input', updateCustomerInfo);
    taxRateInput.addEventListener('input', updateTotals);
    globalDiscountInput.addEventListener('input', updateTotals);
    paymentMethodInput.addEventListener('change', updatePaymentSummary);
    amountPaidInput.addEventListener('input', updatePaymentSummary);
    billItemsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.delete-item-btn');
        if (button) deleteItem(parseInt(button.dataset.id));
    });
}
document.addEventListener('DOMContentLoaded', initializeAppLogic);

async function fetchBooksAndInitialize() {
    try {
        const response = await fetch('/api/books');
        books = await response.json();
        populateBookDropdown();
        populateAuthorDropdown();
    } catch (error) { console.error("Could not fetch books:", error); }
}

async function fetchCustomersAndInitialize() {
    try {
        const response = await fetch('/api/customers');
        customers = await response.json();
        populateCustomerList();
    } catch (error) { console.error("Could not fetch customers:", error); }
}

async function initializeInvoiceCounter() {
    try {
        const response = await fetch('/api/last_invoice_number');
        const data = await response.json();
        invoiceCounter = data.last_invoice_number + 1;
    } catch (error) { invoiceCounter = 1; }
    setInitialDetails();
}

function populateCustomerList() {
    customerList.innerHTML = '';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        customerList.appendChild(option);
    });
}

function handleCustomerSelection() {
    const name = customerNameInput.value;
    const selectedCustomer = customers.find(c => c.name === name);
    if (selectedCustomer) {
        customerAddressInput.value = selectedCustomer.address || '';
        if (selectedCustomer.phone) {
            // Basic logic to split country code from phone number
            // Assumes codes are like +91, +1 etc.
            const phoneStr = selectedCustomer.phone;
            const plusIndex = phoneStr.indexOf('+');
            let code = '+91'; // Default
            let number = phoneStr;

            if (plusIndex === 0) {
                 // Find the end of the country code
                let codeEndIndex = phoneStr.substring(1).search(/\D/); // find non-digit
                if(codeEndIndex === -1) codeEndIndex = phoneStr.length; else codeEndIndex += 1;
                
                if (phoneStr.length > 1 && phoneStr.length <= 4) { // typical country code length
                     code = phoneStr;
                     number = '';
                } else {
                    let potentialCode = phoneStr.substring(0, 4); // check up to 4 chars
                    if(potentialCode.match(/^\+\d{1,3}$/)) {
                        code = potentialCode;
                        number = phoneStr.substring(potentialCode.length);
                    }
                }
            }
            countryCodeInput.value = code;
            customerPhoneInput.value = number;
        } else {
            customerPhoneInput.value = '';
            countryCodeInput.value = '+91';
        }
    }
    updateCustomerInfo();
}

// (The rest of your functions remain the same)
// ...

