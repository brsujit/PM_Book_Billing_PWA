document.addEventListener('DOMContentLoaded', () => {
    // --- GRAB ALL DOM ELEMENTS ---
    const bookForm = document.getElementById('book-form');
    const formTitle = document.getElementById('form-title');
    const hiddenBookId = document.getElementById('book-id-hidden');
    const bookCodeInput = document.getElementById('book-code');
    const bookTitleInput = document.getElementById('book-title');
    const bookAuthorInput = document.getElementById('book-author');
    const bookPriceInput = document.getElementById('book-price');
    const bookStockInput = document.getElementById('book-stock');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');

    // --- INITIAL DATA FETCH ---
    fetchBooks();

    // --- EVENT LISTENERS ---

    // Form submission (for both Add and Update)
    bookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookId = hiddenBookId.value;
        const url = bookId ? `/api/book/${bookId}` : '/api/book';
        const method = bookId ? 'PUT' : 'POST';

        const bookData = {
            id: parseInt(bookCodeInput.value) || 0,
            title: bookTitleInput.value,
            author: bookAuthorInput.value,
            price: parseFloat(bookPriceInput.value),
            stock: parseInt(bookStockInput.value)
        };
        
        // In an update, the ID in the URL is the source of truth, so we don't send it in the body.
        if (method === 'PUT') {
            delete bookData.id;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                fetchBooks();
                clearForm();
            }
        } catch (error) {
            console.error('Form submission error:', error);
            alert('An error occurred. Check the console for details.');
        }
    });

    // Clear form button
    clearFormBtn.addEventListener('click', clearForm);

    // Table actions (Edit/Delete) using event delegation
    inventoryTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const bookId = target.dataset.id;
            editBook(bookId);
        } else if (target.classList.contains('delete-btn')) {
            const bookId = target.dataset.id;
            deleteBook(bookId);
        }
    });

    // ** CSV Import Button Listener **
    if (importCsvBtn && csvFileInput) {
        importCsvBtn.addEventListener('click', () => {
            csvFileInput.click(); // Trigger the hidden file input
        });

        csvFileInput.addEventListener('change', handleCsvUpload);
    }

    // --- FUNCTIONS ---

    // Fetch all books and render the table
    async function fetchBooks() {
        try {
            const response = await fetch('/api/books');
            const books = await response.json();
            inventoryTableBody.innerHTML = ''; // Clear existing rows
            books.forEach(book => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="py-3 text-sm text-gray-600">${book.id}</td>
                    <td class="py-3 text-sm font-medium text-gray-800">${book.title}</td>
                    <td class="py-3 text-sm text-gray-600">${book.author || ''}</td>
                    <td class="py-3 text-sm text-right text-gray-600">₹${book.price.toFixed(2)}</td>
                    <td class="py-3 text-sm text-center text-gray-600">${book.stock}</td>
                    <td class="py-3 text-center space-x-2">
                        <button class="edit-btn text-blue-500 hover:text-blue-700" data-id="${book.id}">Edit</button>
                        <button class="delete-btn text-red-500 hover:text-red-700" data-id="${book.id}">Delete</button>
                    </td>
                `;
                inventoryTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    }

    // Populate the form for editing a book
    async function editBook(id) {
        try {
            const response = await fetch(`/api/book/${id}`);
            const book = await response.json();
            formTitle.textContent = `Editing Book (Code: ${book.id})`;
            hiddenBookId.value = book.id;
            bookCodeInput.value = book.id;
            bookCodeInput.readOnly = true; // Code cannot be changed during an edit
            bookTitleInput.value = book.title;
            bookAuthorInput.value = book.author;
            bookPriceInput.value = book.price;
            bookStockInput.value = book.stock;
            window.scrollTo(0, 0); // Scroll to top to see the form
        } catch (error) {
            console.error('Error fetching book for edit:', error);
        }
    }

    // Delete a book
    async function deleteBook(id) {
        if (confirm(`Are you sure you want to delete book with code ${id}?`)) {
            try {
                const response = await fetch(`/api/book/${id}`, { method: 'DELETE' });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    fetchBooks();
                }
            } catch (error) {
                console.error('Error deleting book:', error);
            }
        }
    }

    // Clear the form fields and reset title
    function clearForm() {
        formTitle.textContent = 'Add New Book';
        bookForm.reset();
        hiddenBookId.value = '';
        bookCodeInput.readOnly = false;
        bookCodeInput.focus();
    }

    // Handle the CSV file upload
    async function handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            const response = await fetch('/api/import_csv', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            alert(result.message);
            if (result.status === 'success') {
                fetchBooks(); // Refresh the table with new data
            }
        } catch (error) {
            alert('An error occurred during the CSV import.');
            console.error('CSV Import Error:', error);
        }

        // Reset the file input to allow uploading the same file again
        event.target.value = '';
    }
});

