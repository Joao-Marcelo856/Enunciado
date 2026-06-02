const STORAGE_KEY = "readers";
const LOANS_STORAGE_KEY = "loans";

const authUserInput = document.getElementById("auth-user");
const authCpfInput = document.getElementById("auth-cpf");
const authEmailInput = document.getElementById("auth-email");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const bookSearchInput = document.getElementById("book-search");
const bookSearchBtn = document.getElementById("book-search-btn");
const loanFinalizeBtn = document.getElementById("loan-finalize-btn");
const readersListEl = document.getElementById("readers-list");
const booksResultsEl = document.getElementById("books-results");
const loansListEl = document.getElementById("loans-list");
const selectedReaderEl = document.getElementById("selected-reader");
const selectedBookEl = document.getElementById("selected-book");
const authMessageEl = document.getElementById("message");
const loanMessageEl = document.getElementById("loan-message");

let selectedReader = null;
let selectedBooks = [];

const isValidCPF = cpf => cpf.replace(/\D/g, "").length === 11;
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// API / data layer
const readersStorage = {
    getAll() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    },
    save(readers) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(readers));
    },
    find(cpf) {
        return this.getAll().find(reader => reader.cpf === cpf) || null;
    },
    exists(cpf) {
        return this.getAll().some(reader => reader.cpf === cpf);
    },
    add(reader) {
        const readers = this.getAll();
        readers.push(reader);
        this.save(readers);
    },
    remove(cpf) {
        this.save(this.getAll().filter(reader => reader.cpf !== cpf));
    }
};

const loansStorage = {
    getAll() {
        return JSON.parse(localStorage.getItem(LOANS_STORAGE_KEY) || "[]");
    },
    save(loans) {
        localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    },
    add(loan) {
        const loans = this.getAll();
        loans.push(loan);
        this.save(loans);
    }
};

function fetchBooks(query) {
    return fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=10`)
        .then(response => response.json())
        .then(data => data.docs);
}

// UI / screen manipulation
function showMessage(text, type, element) {
    element.textContent = text;
    element.className = `message ${type}`;
    setTimeout(() => {
        element.textContent = "";
        element.className = "message";
    }, 3000);
}

function clearAuthInputs() {
    authUserInput.value = "";
    authCpfInput.value = "";
    authEmailInput.value = "";
}

function updateSelectedReaderUI() {
    if (!selectedReader) {
        selectedReaderEl.textContent = "Nenhum leitor selecionado";
        return;
    }

    selectedReaderEl.innerHTML = `
        <p><strong>Leitor:</strong> ${selectedReader.username}</p>
        <p><strong>CPF:</strong> ${selectedReader.cpf}</p>
    `;
}

function updateSelectedBookUI() {
    if (selectedBooks.length === 0) {
        selectedBookEl.textContent = "Nenhum livro selecionado";
        return;
    }

    selectedBookEl.innerHTML = `
        <p><strong>Livros selecionados:</strong></p>
        <ul class="selected-books-list">
            ${selectedBooks.map((book, index) => `
                <li class="selected-book-item">
                    <span>
                        <strong>${book.title}</strong><br>
                        <small>${book.author}</small>
                    </span>
                    <button type="button" class="btn btn-danger remove-book-btn" data-index="${index}">
                        Remover
                    </button>
                </li>
            `).join("")}
        </ul>
    `;

    selectedBookEl.querySelectorAll(".remove-book-btn").forEach(button => {
        button.addEventListener("click", event => {
            const index = Number(event.currentTarget.dataset.index);
            removeSelectedBook(index);
        });
    });
}

function removeSelectedBook(index) {
    selectedBooks.splice(index, 1);
    updateSelectedBookUI();
}

function renderReadersList() {
    const readers = readersStorage.getAll();
    readersListEl.innerHTML = "";

    if (readers.length === 0) {
        readersListEl.innerHTML = '<li class="no-results">Nenhum leitor cadastrado</li>';
        return;
    }

    readers.forEach(reader => {
        const item = document.createElement("li");
        item.className = "reader-item";
        item.innerHTML = `
            <div class="reader-info">
                <p><strong>${reader.username}</strong></p>
                <p>CPF: ${reader.cpf}</p>
                <p>E-mail: ${reader.email}</p>
            </div>
        `;

        const selectBtn = document.createElement("button");
        selectBtn.className = "btn btn-primary";
        selectBtn.type = "button";
        selectBtn.textContent = "Selecionar";
        selectBtn.addEventListener("click", () => selectReader(reader.cpf));

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-danger";
        removeBtn.type = "button";
        removeBtn.textContent = "Remover";
        removeBtn.addEventListener("click", () => deleteReader(reader.cpf));

        item.append(selectBtn, removeBtn);
        readersListEl.appendChild(item);
    });
}

function renderLoansList() {
    const loans = loansStorage.getAll();
    loansListEl.innerHTML = "";

    if (loans.length === 0) {
        loansListEl.innerHTML = '<div class="no-results">Nenhum empréstimo ativo</div>';
        return;
    }

    loans.forEach(loan => {
        const card = document.createElement("div");
        card.className = "loan-card";
        card.innerHTML = `
            <img src="${loan.coverUrl}" alt="${loan.bookTitle}">
            <h3>${loan.bookTitle}</h3>
            <p><strong>Cliente:</strong> ${loan.clientName}</p>
            <p><strong>Devolução:</strong> ${loan.returnDate}</p>
        `;
        loansListEl.appendChild(card);
    });
}

function renderBooksResults(books) {
    booksResultsEl.innerHTML = "";

    if (!books || books.length === 0) {
        booksResultsEl.innerHTML = '<div class="no-results">Nenhum livro encontrado</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    books.forEach(book => {
        const coverUrl = book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
            : "https://via.placeholder.com/150x200?text=Sem+Capa";

        const title = book.title || "Título desconhecido";
        const author = book.author_name ? book.author_name[0] : "Autor desconhecido";

        const card = document.createElement("div");
        card.className = "book-card";
        card.innerHTML = `
            <img src="${coverUrl}" alt="${title}" class="book-cover" onerror="this.src='https://via.placeholder.com/150x200?text=Sem+Capa'">
            <p class="book-title">${title}</p>
            <p class="book-author">${author}</p>
        `;

        const selectButton = document.createElement("button");
        selectButton.className = "btn-select";
        selectButton.type = "button";
        selectButton.textContent = "Adicionar ao empréstimo";
        selectButton.addEventListener("click", () => selectBook(title, author, coverUrl));

        card.appendChild(selectButton);
        fragment.appendChild(card);
    });

    booksResultsEl.appendChild(fragment);
}

// Handlers
function handleAuth() {
    const username = authUserInput.value.trim();
    const cpf = authCpfInput.value.trim();
    const email = authEmailInput.value.trim();

    if (!username || !cpf || !email) {
        showMessage("Preencha todos os campos", "error", authMessageEl);
        return;
    }

    if (!isValidCPF(cpf)) {
        showMessage("CPF inválido", "error", authMessageEl);
        return;
    }

    if (!isValidEmail(email)) {
        showMessage("E-mail inválido", "error", authMessageEl);
        return;
    }

    if (readersStorage.exists(cpf)) {
        showMessage("CPF já cadastrado", "error", authMessageEl);
        return;
    }

    readersStorage.add({ username, cpf, email });
    clearAuthInputs();
    showMessage("Leitor cadastrado com sucesso!", "success", authMessageEl);
    renderReadersList();
}

function deleteReader(cpf) {
    readersStorage.remove(cpf);

    if (selectedReader?.cpf === cpf) {
        selectedReader = null;
        updateSelectedReaderUI();
    }

    renderReadersList();
}

function selectReader(cpf) {
    selectedReader = readersStorage.find(cpf);
    updateSelectedReaderUI();
}

function selectBook(title, author, coverUrl) {
    if (selectedBooks.some(book => book.title === title && book.author === author)) {
        showMessage("Livro já selecionado para empréstimo", "error", loanMessageEl);
        return;
    }

    selectedBooks.push({ title, author, coverUrl });
    updateSelectedBookUI();
    showMessage("Livro adicionado ao empréstimo", "success", loanMessageEl);
}

function finalizeLoan() {
    if (!selectedReader || selectedBooks.length === 0) {
        showMessage("Selecione leitor e livro antes de finalizar o empréstimo", "error", loanMessageEl);
        return;
    }

    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 7);
    const formattedDate = returnDate.toLocaleDateString("pt-BR");

    selectedBooks.forEach(book => {
        loansStorage.add({
            clientName: selectedReader.username,
            bookTitle: book.title,
            coverUrl: book.coverUrl,
            returnDate: formattedDate
        });
    });

    selectedBooks = [];
    updateSelectedBookUI();
    showMessage("Empréstimo finalizado com sucesso!", "success", loanMessageEl);
    renderLoansList();
}

function searchBooks() {
    const query = bookSearchInput.value.trim();

    if (!query) {
        booksResultsEl.innerHTML = '<div class="no-results">Digite o nome de um livro</div>';
        return;
    }

    booksResultsEl.innerHTML = '<div class="no-results">Carregando...</div>';

    fetchBooks(query)
        .then(renderBooksResults)
        .catch(() => {
            booksResultsEl.innerHTML = '<div class="no-results">Erro ao buscar livros</div>';
        });
}

function initEventListeners() {
    authSubmitBtn.addEventListener("click", handleAuth);
    bookSearchBtn.addEventListener("click", searchBooks);
    loanFinalizeBtn.addEventListener("click", finalizeLoan);
}

function init() {
    initEventListeners();
    renderReadersList();
    renderLoansList();
    updateSelectedReaderUI();
    updateSelectedBookUI();
}

init();