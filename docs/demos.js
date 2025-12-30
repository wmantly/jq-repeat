// Wait for DOM to be ready
$(document).ready(function() {
    console.log('jq-repeat demos loaded!');

    // Initialize demos with some data
    initDemos();
});

function initDemos() {
    // Initialize array demo with some items
    $.scope.arrayDemo.push(
        { value: 'A' },
        { value: 'B' },
        { value: 'C' }
    );
    updateArrayLength();

    // Setup animation hooks for messages
    $.scope.messages.__put = function($el, item, list) {
        $el.hide().fadeIn(300);
    };

    $.scope.messages.__take = function($el, item, list) {
        $el.fadeOut(300, function() {
            $(this).remove();
        });
    };
}

// ===== BASIC TODO DEMO =====
function addTodo() {
    const input = $('#todo-input');
    const task = input.val().trim();
    if (task) {
        $.scope.todos.push({ task: task });
        input.val('');
    }
}

function clearTodos() {
    $.scope.todos.empty();
}

// Add todo on Enter key
$(document).on('keypress', '#todo-input', function(e) {
    if (e.which === 13) {
        addTodo();
    }
});

// ===== SORTING DEMO =====
function addUser() {
    const name = $('#user-name').val().trim();
    const score = parseInt($('#user-score').val());

    if (name && !isNaN(score)) {
        $.scope.users.push({ name: name, score: score });
        $('#user-name').val('');
        $('#user-score').val('');
    }
}

function clearUsers() {
    $.scope.users.empty();
}

// ===== CUSTOM INDEX KEY DEMO =====
let productCounter = 1;

function addProduct() {
    const id = $('#product-id').val().trim() || 'prod-' + String(productCounter++).padStart(3, '0');
    const name = $('#product-name').val().trim();
    const price = parseInt($('#product-price').val());

    if (name && !isNaN(price)) {
        $.scope.products.push({
            id: id,
            name: name,
            price: price
        });

        $('#product-id').val('');
        $('#product-name').val('');
        $('#product-price').val('');
    }
}

function updateProduct() {
    if ($.scope.products.length > 0) {
        const firstProduct = $.scope.products[0];
        const newPrice = Math.floor(Math.random() * 500) + 500;

        $.scope.products.update(firstProduct.id, {
            price: newPrice
        });

        alert('Updated ' + firstProduct.name + ' to $' + newPrice);
    } else {
        alert('No products to update! Add a product first.');
    }
}

// ===== ANIMATIONS DEMO =====
let messageCounter = 1;

function addMessage() {
    const input = $('#message-input');
    const text = input.val().trim() || 'Message #' + messageCounter++;

    $.scope.messages.push({ text: text });
    input.val('');
}

// ===== ARRAY METHODS DEMO =====
let arrayCounter = 0;

function arrayPush() {
    arrayCounter++;
    $.scope.arrayDemo.push({ value: String.fromCharCode(65 + (arrayCounter % 26)) });
    updateArrayLength();
}

function arrayPop() {
    if ($.scope.arrayDemo.length > 0) {
        const item = $.scope.arrayDemo.pop();
        updateArrayLength();
        console.log('Popped:', item);
    }
}

function arrayUnshift() {
    arrayCounter++;
    $.scope.arrayDemo.unshift({ value: String.fromCharCode(90 - (arrayCounter % 26)) });
    updateArrayLength();
}

function arrayShift() {
    if ($.scope.arrayDemo.length > 0) {
        const item = $.scope.arrayDemo.shift();
        updateArrayLength();
        console.log('Shifted:', item);
    }
}

function arrayReverse() {
    $.scope.arrayDemo.reverse();
}

function arraySplice() {
    if ($.scope.arrayDemo.length >= 2) {
        const removed = $.scope.arrayDemo.splice(1, 1);
        updateArrayLength();
        console.log('Removed:', removed);
    } else {
        alert('Need at least 2 items to splice!');
    }
}

function updateArrayLength() {
    $('#array-length').text($.scope.arrayDemo.length);
}

// ===== NESTED TEMPLATES DEMO =====
let deptCounter = 1;
let empCounter = 1;

function addDepartment() {
    const deptNames = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const deptName = deptNames[(deptCounter - 1) % deptNames.length];

    $.scope.departments.push({
        name: deptName + ' ' + deptCounter,
        employees: []
    });

    deptCounter++;
}

function addEmployee() {
    if ($.scope.departments.length === 0) {
        alert('Add a department first!');
        return;
    }

    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'Tom', 'Emily'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis'];

    const firstName = firstNames[empCounter % firstNames.length];
    const lastName = lastNames[empCounter % lastNames.length];

    $.scope.departments[0].employees.push({
        firstName: firstName,
        lastName: lastName
    });

    empCounter++;
}

// ===== JQUERY HELPERS DEMO =====
let helperCounter = 1;

function addItem() {
    $.scope.helperItems.push({
        text: 'Item #' + helperCounter++,
        timestamp: new Date().toLocaleTimeString()
    });
}

function updateItem(button) {
    const newText = prompt('Enter new text:');
    if (newText) {
        $(button).scopeItemUpdate({ text: newText });
    }
}

function removeItem(button) {
    $(button).scopeItemRemove();
}

function getItemData(button) {
    const itemData = $(button).scopeItem();
    const scope = $(button).scopeGet();

    $('#helper-output').text(
        'Item Data:\n' + JSON.stringify(itemData, null, 2) +
        '\n\nScope Length: ' + scope.length +
        '\nScope ID: ' + scope.__jqRepeatId
    );
}
