const BOOK_CATEGORIES = [
    "FICTION",
    "NON_FICTION",
    "SCIENCE",
    "HISTORY",
    "POETRY",
    "CHILDREN",
    "TECHNOLOGY"
];

const SORT_OPTIONS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "title", label: "Title (A–Z)" },
    { value: "author", label: "Author (A–Z)" },
    { value: "year", label: "Publication year" }
];

const CATEGORY_OPTIONS = BOOK_CATEGORIES.map((category) => {
    return {
        value: category,
        label: category
            .toLowerCase()
            .split("_")
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(" ")
    };
});

const endpoints = [
    {
        id: "list",
        method: "GET",
        path: "/api/books",
        name: "List books",
        title: "List books",
        description:
            "Retrieve the collection with pagination, search, filtering, and sorting.",
        fields: [
            {
                name: "search",
                label: "Search",
                hint: "title, author, or description",
                type: "text",
                placeholder: "le guin"
            },
            {
                name: "category",
                label: "Category",
                type: "select",
                emptyLabel: "All categories",
                options: CATEGORY_OPTIONS
            },
            {
                name: "sort",
                label: "Sort",
                type: "select",
                options: SORT_OPTIONS,
                value: "newest"
            },
            {
                name: "page",
                label: "Page",
                type: "number",
                value: "1",
                min: 1,
                max: 1000000
            },
            {
                name: "limit",
                label: "Limit",
                hint: "1–50",
                type: "number",
                value: "6",
                min: 1,
                max: 50
            }
        ],
        sample: {
            search: "",
            category: "",
            sort: "newest",
            page: "1",
            limit: "6"
        }
    },
    {
        id: "detail",
        method: "GET",
        path: "/api/books/:id",
        name: "Get one book",
        title: "Get one book",
        description:
            "Retrieve a single book by its numeric identifier. Missing books return 404.",
        idField: "id",
        fields: [
            {
                name: "id",
                label: "Book ID",
                type: "number",
                value: "1",
                min: 1
            }
        ],
        sample: {
            id: "3"
        }
    },
    {
        id: "create",
        method: "POST",
        path: "/api/books",
        name: "Create a book",
        title: "Create a book",
        description:
            "Add a title to the collection. A successful request returns 201 and a Location header.",
        bodyFields: [
            "title",
            "author",
            "category",
            "description",
            "publishedYear",
            "isbn",
            "totalCopies",
            "availableCopies"
        ],
        fields: [
            {
                name: "title",
                label: "Title",
                type: "text",
                placeholder: "The Creative Act",
                full: true,
                required: true
            },
            {
                name: "author",
                label: "Author",
                type: "text",
                placeholder: "Rick Rubin"
            },
            {
                name: "category",
                label: "Category",
                type: "select",
                options: CATEGORY_OPTIONS,
                value: "NON_FICTION"
            },
            {
                name: "publishedYear",
                label: "Published year",
                type: "number",
                value: "2023",
                min: 1450,
                max: 2100
            },
            {
                name: "isbn",
                label: "ISBN",
                hint: "optional",
                type: "text",
                placeholder: "9780593652886"
            },
            {
                name: "totalCopies",
                label: "Total copies",
                type: "number",
                value: "3",
                min: 1,
                max: 1000
            },
            {
                name: "availableCopies",
                label: "Available copies",
                hint: "defaults to total",
                type: "number",
                min: 0,
                max: 1000
            },
            {
                name: "description",
                label: "Description",
                hint: "at least 10 characters",
                type: "textarea",
                placeholder:
                    "A short book about attention, preparation, and making things.",
                full: true,
                required: true
            }
        ],
        sample: {
            title: "The Creative Act",
            author: "Rick Rubin",
            category: "NON_FICTION",
            description:
                "A short book about attention, preparation, and making things over and over again.",
            publishedYear: "2023",
            isbn: "9780593652886",
            totalCopies: "3",
            availableCopies: "3"
        }
    },
    {
        id: "update",
        method: "PATCH",
        path: "/api/books/:id",
        name: "Update a book",
        title: "Update a book",
        description:
            "Apply a partial update. Only the supplied fields change; unknown fields are rejected.",
        idField: "id",
        bodyFields: [
            "title",
            "author",
            "category",
            "description",
            "publishedYear",
            "isbn",
            "totalCopies",
            "availableCopies"
        ],
        fields: [
            {
                name: "id",
                label: "Book ID",
                type: "number",
                value: "1",
                min: 1
            },
            {
                name: "title",
                label: "Title",
                hint: "leave blank to keep",
                type: "text",
                placeholder: "The Left Hand of Darkness"
            },
            {
                name: "author",
                label: "Author",
                hint: "leave blank to keep",
                type: "text",
                placeholder: "Ursula K. Le Guin"
            },
            {
                name: "category",
                label: "Category",
                hint: "leave blank to keep",
                type: "select",
                emptyLabel: "No change",
                options: CATEGORY_OPTIONS
            },
            {
                name: "publishedYear",
                label: "Published year",
                hint: "leave blank to keep",
                type: "number",
                min: 1450,
                max: 2100
            },
            {
                name: "isbn",
                label: "ISBN",
                hint: "leave blank to keep",
                type: "text"
            },
            {
                name: "totalCopies",
                label: "Total copies",
                hint: "leave blank to keep",
                type: "number",
                min: 1,
                max: 1000
            },
            {
                name: "availableCopies",
                label: "Available copies",
                hint: "leave blank to keep",
                type: "number",
                min: 0,
                max: 1000
            },
            {
                name: "description",
                label: "Description",
                hint: "leave blank to keep",
                type: "textarea",
                full: true
            }
        ],
        sample: {
            id: "1",
            title: "The Left Hand of Darkness (Anniversary Edition)",
            totalCopies: "5"
        }
    },
    {
        id: "delete",
        method: "DELETE",
        path: "/api/books/:id",
        name: "Delete a book",
        title: "Delete a book",
        description:
            "Remove a title from the collection. A successful delete returns 204 with no body.",
        idField: "id",
        fields: [
            {
                name: "id",
                label: "Book ID",
                type: "number",
                value: "14",
                min: 1
            }
        ],
        sample: {
            id: "14"
        }
    }
];

const state = {
    activeEndpointId: "list",
    lastBooks: []
};

const elements = {
    endpointList: document.querySelector("#endpoint-list"),
    form: document.querySelector("#request-form"),
    fields: document.querySelector("#form-fields"),
    requestTitle: document.querySelector("#request-title"),
    requestDescription: document.querySelector("#request-description"),
    requestMethod: document.querySelector("#request-method"),
    requestPath: document.querySelector("#request-path"),
    sendButton: document.querySelector("#send-button"),
    sampleButton: document.querySelector("#sample-button"),
    resetButton: document.querySelector("#reset-button"),
    statusBadge: document.querySelector("#status-badge"),
    responseTime: document.querySelector("#response-time"),
    responseHeaders: document.querySelector("#response-headers"),
    responseBody: document.querySelector("#response-body"),
    shelf: document.querySelector("#shelf"),
    refreshShelf: document.querySelector("#refresh-shelf"),
    statTotal: document.querySelector("#stat-total"),
    statAvailable: document.querySelector("#stat-available"),
    statCopies: document.querySelector("#stat-copies")
};

function getActiveEndpoint() {
    return (
        endpoints.find((endpoint) => endpoint.id === state.activeEndpointId) ??
        endpoints[0]
    );
}

function methodClass(method) {
    return `method-${method.toLowerCase()}`;
}

function getField(name) {
    return elements.fields.querySelector(`[name="${name}"]`);
}

function readFormValues() {
    const values = {};

    for (const element of elements.fields.querySelectorAll("[name]")) {
        values[element.name] = element.value;
    }

    return values;
}

function setFormValues(values) {
    for (const [name, value] of Object.entries(values)) {
        const field = getField(name);

        if (field) {
            field.value = value;
        }
    }

    updatePathPreview();
}

function createOption(option) {
    const element = document.createElement("option");

    element.value = option.value;
    element.textContent = option.label;

    return element;
}

function createField(field, values) {
    const wrapper = document.createElement("label");

    wrapper.className = field.full ? "field field-full" : "field";

    const label = document.createElement("span");

    label.className = "field-label";

    const labelText = document.createElement("span");

    labelText.textContent = field.label;

    if (field.required) {
        labelText.textContent += " *";
    }

    label.append(labelText);

    if (field.hint) {
        const hint = document.createElement("span");

        hint.className = "field-hint";
        hint.textContent = field.hint;

        label.append(hint);
    }

    wrapper.append(label);

    let input;

    if (field.type === "select") {
        input = document.createElement("select");

        const emptyOption = createOption({
            value: "",
            label: field.emptyLabel ?? "Default"
        });

        input.append(emptyOption);

        for (const option of field.options) {
            input.append(createOption(option));
        }
    } else if (field.type === "textarea") {
        input = document.createElement("textarea");
    } else {
        input = document.createElement("input");
        input.type = field.type;
    }

    input.className = "input";
    input.name = field.name;

    if (field.placeholder) {
        input.placeholder = field.placeholder;
    }

    if (field.type === "number") {
        if (field.min !== undefined) {
            input.min = String(field.min);
        }

        if (field.max !== undefined) {
            input.max = String(field.max);
        }
    }

    const value = values[field.name] ?? field.value ?? "";

    input.value = value;

    if (field.required) {
        input.setAttribute("aria-required", "true");
    }

    input.addEventListener("input", updatePathPreview);
    input.addEventListener("change", updatePathPreview);

    wrapper.append(input);

    return wrapper;
}

function renderEndpointList() {
    elements.endpointList.replaceChildren();

    for (const endpoint of endpoints) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "endpoint-button";
        button.dataset.endpointId = endpoint.id;

        if (endpoint.id === state.activeEndpointId) {
            button.classList.add("is-active");
        }

        const method = document.createElement("span");

        method.className = `method-badge ${methodClass(endpoint.method)}`;
        method.textContent = endpoint.method;

        const copy = document.createElement("span");

        copy.className = "endpoint-copy";

        const path = document.createElement("span");

        path.className = "endpoint-path";
        path.textContent = endpoint.path;

        const name = document.createElement("span");

        name.className = "endpoint-name";
        name.textContent = endpoint.name;

        copy.append(path, name);
        button.append(method, copy);

        button.addEventListener("click", () => {
            selectEndpoint(endpoint.id);
        });

        elements.endpointList.append(button);
    }
}

function renderRequestPanel() {
    const endpoint = getActiveEndpoint();

    elements.requestTitle.textContent = endpoint.title;
    elements.requestDescription.textContent = endpoint.description;
    elements.requestMethod.textContent = endpoint.method;
    elements.requestMethod.className =
        `method-badge ${methodClass(endpoint.method)}`;

    elements.fields.replaceChildren();

    for (const field of endpoint.fields) {
        elements.fields.append(createField(field, {}));
    }

    updatePathPreview();
}

function selectEndpoint(endpointId) {
    state.activeEndpointId = endpointId;

    renderEndpointList();
    renderRequestPanel();
    resetResponse();
}

function updatePathPreview() {
    const endpoint = getActiveEndpoint();
    const values = readFormValues();

    let path = endpoint.path;

    if (endpoint.idField) {
        const id = values[endpoint.idField] ?? "";

        path = path.replace(
            `:${endpoint.idField}`,
            encodeURIComponent(id || "")
        );
    }

    const query = new URLSearchParams();

    for (const field of endpoint.fields) {
        if (field.name === endpoint.idField) {
            continue;
        }

        if (endpoint.bodyFields?.includes(field.name)) {
            continue;
        }

        const value = values[field.name]?.trim();

        if (value) {
            query.set(field.name, value);
        }
    }

    const queryString = query.toString();

    elements.requestPath.textContent = queryString
        ? `${path}?${queryString}`
        : path;
}

function buildRequestBody(endpoint, values) {
    const body = {};

    for (const name of endpoint.bodyFields ?? []) {
        const rawValue = values[name]?.trim();

        if (!rawValue) {
            continue;
        }

        const field = endpoint.fields.find((candidate) => {
            return candidate.name === name;
        });

        if (field?.type === "number") {
            body[name] = Number(rawValue);
        } else {
            body[name] = rawValue;
        }
    }

    return body;
}

function resetResponse() {
    elements.statusBadge.textContent = "Idle";
    elements.statusBadge.className = "status-badge is-idle";
    elements.responseTime.textContent = "";
    elements.responseHeaders.innerHTML =
        '<p class="response-placeholder">Response headers will appear here.</p>';
    elements.responseBody.textContent =
        "Send a request to see the JSON response.";
}

function statusClass(status) {
    if (status >= 200 && status < 300) {
        return "is-success";
    }

    if (status >= 300 && status < 400) {
        return "is-warning";
    }

    return "is-error";
}

function renderResponseHeaders(headers) {
    const entries = [...headers.entries()].sort((left, right) => {
        return left[0].localeCompare(right[0]);
    });

    elements.responseHeaders.replaceChildren();

    if (entries.length === 0) {
        const placeholder = document.createElement("p");

        placeholder.className = "response-placeholder";
        placeholder.textContent = "No response headers were exposed.";

        elements.responseHeaders.append(placeholder);

        return;
    }

    for (const [key, value] of entries) {
        const pair = document.createElement("div");

        pair.className = "header-pair";

        const keyElement = document.createElement("span");

        keyElement.className = "header-key";
        keyElement.textContent = key;

        const valueElement = document.createElement("span");

        valueElement.className = "header-value";
        valueElement.textContent = value;
        valueElement.title = value;

        pair.append(keyElement, valueElement);
        elements.responseHeaders.append(pair);
    }
}

function readResponseBody(text) {
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function sendRequest() {
    const endpoint = getActiveEndpoint();
    const values = readFormValues();
    const path = elements.requestPath.textContent;
    const hasBody = endpoint.bodyFields !== undefined;

    elements.sendButton.disabled = true;
    elements.sendButton.textContent = "Sending…";

    const startedAt = performance.now();

    try {
        const response = await fetch(path, {
            method: endpoint.method,
            headers: hasBody
                ? {
                      "Content-Type": "application/json",
                      Accept: "application/json"
                  }
                : {
                      Accept: "application/json"
                  },
            body: hasBody
                ? JSON.stringify(buildRequestBody(endpoint, values))
                : undefined
        });

        const duration = Math.round(performance.now() - startedAt);
        const text = await response.text();
        const parsedBody = readResponseBody(text);

        elements.statusBadge.textContent =
            `${response.status} ${response.statusText}`.trim();
        elements.statusBadge.className =
            `status-badge ${statusClass(response.status)}`;
        elements.responseTime.textContent = `${duration} ms`;

        renderResponseHeaders(response.headers);

        if (response.status === 204) {
            elements.responseBody.textContent =
                "204 No Content\n\nThe request succeeded. DELETE responses intentionally have no body.";
        } else if (parsedBody === null) {
            elements.responseBody.textContent =
                "The server returned an empty response body.";
        } else if (typeof parsedBody === "string") {
            elements.responseBody.textContent = parsedBody;
        } else {
            elements.responseBody.textContent = JSON.stringify(parsedBody, null, 4);
        }

        if (response.ok && endpoint.method !== "GET") {
            await refreshCollection();
        }
    } catch (error) {
        const duration = Math.round(performance.now() - startedAt);

        elements.statusBadge.textContent = "Network error";
        elements.statusBadge.className = "status-badge is-error";
        elements.responseTime.textContent = `${duration} ms`;
        elements.responseHeaders.innerHTML =
            '<p class="response-placeholder">The request did not reach the server.</p>';
        elements.responseBody.textContent =
            `Could not reach the API.\n\n${error.message}\n\n` +
            "Check that the Fastify server is running and that the URL is correct.";
    } finally {
        elements.sendButton.disabled = false;
        elements.sendButton.textContent = "Send request";
    }
}

function fillSampleData() {
    const endpoint = getActiveEndpoint();

    setFormValues(endpoint.sample);
}

async function requestJson(path) {
    const response = await fetch(path, {
        headers: {
            Accept: "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Request failed.");
    }

    return data;
}

function renderShelf(books) {
    elements.shelf.replaceChildren();

    if (books.length === 0) {
        const empty = document.createElement("p");

        empty.className = "shelf-empty";
        empty.textContent =
            "The shelf is empty. Create a book with the POST endpoint above.";

        elements.shelf.append(empty);

        return;
    }

    for (const book of books) {
        const card = document.createElement("button");

        card.type = "button";
        card.className = "shelf-card";
        card.title = `Load GET /api/books/${book.id}`;

        const spine = document.createElement("span");

        spine.className = "shelf-spine";
        spine.dataset.category = book.category;
        spine.setAttribute("aria-hidden", "true");
        spine.textContent = book.category[0];

        const copy = document.createElement("span");

        copy.className = "shelf-copy";

        const category = document.createElement("span");

        category.className = "shelf-category";
        category.textContent = book.category.replaceAll("_", " ");

        const title = document.createElement("span");

        title.className = "shelf-title";
        title.textContent = book.title;

        const author = document.createElement("span");

        author.className = "shelf-author";
        author.textContent = book.author;

        copy.append(category, title, author);

        const count = document.createElement("span");

        count.className = "shelf-count";
        count.textContent = `${book.availableCopies}/${book.totalCopies}`;

        card.append(spine, copy, count);

        card.addEventListener("click", () => {
            selectEndpoint("detail");
            setFormValues({ id: String(book.id) });
            void sendRequest();
        });

        elements.shelf.append(card);
    }
}

async function loadShelf() {
    elements.shelf.innerHTML =
        '<p class="shelf-placeholder">Loading the shelf…</p>';

    try {
        const result = await requestJson("/api/books?limit=6&sort=newest");

        state.lastBooks = result.data;

        renderShelf(result.data);
    } catch (error) {
        elements.shelf.innerHTML =
            `<p class="shelf-empty">Could not load the shelf: ${error.message}</p>`;
    }
}

async function loadCollectionStats() {
    try {
        const result = await requestJson("/api/books?limit=50&sort=newest");
        const books = result.data;

        const availableTitles = books.filter((book) => {
            return book.availableCopies > 0;
        }).length;

        const totalCopies = books.reduce((sum, book) => {
            return sum + book.totalCopies;
        }, 0);

        elements.statTotal.textContent = result.meta.pagination.total;
        elements.statAvailable.textContent = availableTitles;
        elements.statCopies.textContent = totalCopies;
    } catch {
        elements.statTotal.textContent = "—";
        elements.statAvailable.textContent = "—";
        elements.statCopies.textContent = "—";
    }
}

async function refreshCollection() {
    await Promise.all([loadShelf(), loadCollectionStats()]);
}

function initializeEvents() {
    elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        void sendRequest();
    });

    elements.sampleButton.addEventListener("click", fillSampleData);

    elements.resetButton.addEventListener("click", () => {
        window.setTimeout(() => {
            fillFormDefaults();
        }, 0);
    });

    elements.form.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            elements.form.requestSubmit();
        }
    });

    elements.refreshShelf.addEventListener("click", () => {
        void refreshCollection();
    });
}

function fillFormDefaults() {
    const endpoint = getActiveEndpoint();
    const defaults = {};

    for (const field of endpoint.fields) {
        defaults[field.name] = field.value ?? "";
    }

    setFormValues(defaults);
}

async function start() {
    renderEndpointList();
    renderRequestPanel();
    initializeEvents();
    resetResponse();

    await refreshCollection();
    await sendRequest();
}

void start();
