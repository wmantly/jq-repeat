// Wait for DOM to be ready
$(document).ready(function() {
    console.log('jq-repeat demos loaded!');

    // Pre-populate the todo list with some items
    initTodos();

    // Update the todo length display
    updateTodoLength();
});

function initTodos() {
    // Add some initial tasks
    $.scope.todos.push(
        { task: 'Buy groceries' },
        { task: 'Walk the dog' },
        { task: 'Finish project report' },
        { task: 'Call mom' }
    );
}

// ===== DEMO 1: BASIC TODO LIST =====

function addTodo() {
    const input = $('#todo-input');
    const task = input.val().trim();
    if (task) {
        $.scope.todos.push({ task: task });
        input.val('');
        updateTodoLength();
    }
}

function clearTodos() {
    $.scope.todos.empty();
    updateTodoLength();
}

// Add todo on Enter key
$(document).on('keypress', '#todo-input', function(e) {
    if (e.which === 13) {
        addTodo();
    }
});

function updateTodoLength() {
    $('#todo-length').text($.scope.todos.length);
}

// ===== DEMO 2: AUTOMATIC SORTING =====

let sortingEnabled = false;

function enableSorting() {
    if (sortingEnabled) return;

    // Store current items
    const currentItems = $.scope.todos.slice();

    // Clear the list
    $.scope.todos.empty();

    // Find the template element and add sorting attribute
    const $template = $('li[jq-repeat="todos"]').first();
    if ($template.length === 0) {
        // Need to recreate it from the script tag
        const $holder = $('#jq-repeat-holder-todos');
        $holder.after('<li jq-repeat="todos" jr-order-by="task"><span class="todo-item">{{ task }}</span><button class="btn-sm" onclick="$(this).scopeItemRemove()">Remove</button></li>');
    } else {
        $template.attr('jr-order-by', 'task');
    }

    // Re-add all items (they'll be sorted)
    setTimeout(() => {
        currentItems.forEach(item => {
            $.scope.todos.push(item);
        });
        updateTodoLength();
    }, 100);

    sortingEnabled = true;
    $('#sort-btn').hide();
    $('#unsort-btn').show();
    $('#sort-status').text('Sorting Enabled ✓').show();
}

function disableSorting() {
    if (!sortingEnabled) return;

    // Store current items
    const currentItems = $.scope.todos.slice();

    // Clear the list
    $.scope.todos.empty();

    // Remove sorting attribute
    const $template = $('li[jq-repeat="todos"]').first();
    if ($template.length === 0) {
        const $holder = $('#jq-repeat-holder-todos');
        $holder.after('<li jq-repeat="todos"><span class="todo-item">{{ task }}</span><button class="btn-sm" onclick="$(this).scopeItemRemove()">Remove</button></li>');
    } else {
        $template.removeAttr('jr-order-by');
    }

    // Re-add all items
    setTimeout(() => {
        currentItems.forEach(item => {
            $.scope.todos.push(item);
        });
        updateTodoLength();
    }, 100);

    sortingEnabled = false;
    $('#sort-btn').show();
    $('#unsort-btn').hide();
    $('#sort-status').hide();
}

// ===== DEMO 3: CUSTOM ANIMATIONS =====

let animationsEnabled = false;
let originalPut = null;
let originalTake = null;

function enableAnimations() {
    if (animationsEnabled) return;

    // Store original hooks
    originalPut = $.scope.todos.__put;
    originalTake = $.scope.todos.__take;

    // Set animation hooks
    $.scope.todos.__put = function($el, item, list) {
        $el.hide().fadeIn(300);
    };

    $.scope.todos.__take = function($el, item, list) {
        $el.fadeOut(300, function() {
            $(this).remove();
        });
    };

    animationsEnabled = true;
    $('#anim-btn').hide();
    $('#unanim-btn').show();
    $('#anim-status').text('Animations Enabled ✓').show();
}

function disableAnimations() {
    if (!animationsEnabled) return;

    // Restore original hooks
    $.scope.todos.__put = originalPut;
    $.scope.todos.__take = originalTake;

    animationsEnabled = false;
    $('#anim-btn').show();
    $('#unanim-btn').hide();
    $('#anim-status').hide();
}

// ===== DEMO 4: ARRAY METHODS =====

function todoPop() {
    if ($.scope.todos.length > 0) {
        const item = $.scope.todos.pop();
        updateTodoLength();
        console.log('Popped:', item);
    } else {
        alert('No items to pop!');
    }
}

function todoShift() {
    if ($.scope.todos.length > 0) {
        const item = $.scope.todos.shift();
        updateTodoLength();
        console.log('Shifted:', item);
    } else {
        alert('No items to shift!');
    }
}

function todoReverse() {
    $.scope.todos.reverse();
}

function todoSplice() {
    if ($.scope.todos.length >= 2) {
        const removed = $.scope.todos.splice(1, 1);
        updateTodoLength();
        console.log('Removed:', removed);
    } else {
        alert('Need at least 2 items to splice the 2nd one!');
    }
}

// Update todo length whenever items change
$(document).on('DOMSubtreeModified', '#todo-list', function() {
    updateTodoLength();
});
