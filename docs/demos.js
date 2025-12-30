// Wait for DOM to be ready
$(document).ready(function() {
    console.log('jq-repeat demos loaded!');

    // Pre-populate each todo list with some items
    initAllTodos();
});

function initAllTodos() {
    // Demo 1: Basic todo list
    $.scope.todos1.push(
        { task: 'Buy groceries' },
        { task: 'Walk the dog' },
        { task: 'Finish project report' }
    );

    // Demo 2: Sorted todo list
    $.scope.todos2.push(
        { task: 'Zebra task' },
        { task: 'Apple task' },
        { task: 'Monkey task' }
    );

    // Demo 3: Animated todo list
    $.scope.todos3.push(
        { task: 'Task with fade in' },
        { task: 'Another animated task' }
    );

    // Setup animation hooks for todos3
    $.scope.todos3.__put = function($el, item, list) {
        $el.hide().fadeIn(300);
    };

    $.scope.todos3.__take = function($el, item, list) {
        $el.fadeOut(300, function() {
            $(this).remove();
        });
    };

    // Demo 4: Array methods
    $.scope.todos4.push(
        { task: 'Item A' },
        { task: 'Item B' },
        { task: 'Item C' },
        { task: 'Item D' }
    );

    updateTodoLength();
}

// ===== DEMO 1: BASIC TODO LIST =====

function addTodo1() {
    const input = $('#todo-input-1');
    const task = input.val().trim();
    if (task) {
        $.scope.todos1.push({ task: task });
        input.val('');
    }
}

function clearTodos1() {
    $.scope.todos1.empty();
}

$(document).on('keypress', '#todo-input-1', function(e) {
    if (e.which === 13) {
        addTodo1();
    }
});

// ===== DEMO 2: AUTOMATIC SORTING =====

function addTodo2() {
    const input = $('#todo-input-2');
    const task = input.val().trim();
    if (task) {
        $.scope.todos2.push({ task: task });
        input.val('');
    }
}

function clearTodos2() {
    $.scope.todos2.empty();
}

$(document).on('keypress', '#todo-input-2', function(e) {
    if (e.which === 13) {
        addTodo2();
    }
});

// ===== DEMO 3: CUSTOM ANIMATIONS =====

function addTodo3() {
    const input = $('#todo-input-3');
    const task = input.val().trim();
    if (task) {
        $.scope.todos3.push({ task: task });
        input.val('');
    }
}

function clearTodos3() {
    $.scope.todos3.empty();
}

$(document).on('keypress', '#todo-input-3', function(e) {
    if (e.which === 13) {
        addTodo3();
    }
});

// ===== DEMO 4: ARRAY METHODS =====

function addTodo4() {
    const input = $('#todo-input-4');
    const task = input.val().trim();
    if (task) {
        $.scope.todos4.push({ task: task });
        input.val('');
        updateTodoLength();
    }
}

function clearTodos4() {
    $.scope.todos4.empty();
    updateTodoLength();
}

$(document).on('keypress', '#todo-input-4', function(e) {
    if (e.which === 13) {
        addTodo4();
    }
});

function todoPop() {
    if ($.scope.todos4.length > 0) {
        const item = $.scope.todos4.pop();
        updateTodoLength();
        console.log('Popped:', item);
    } else {
        alert('No items to pop!');
    }
}

function todoShift() {
    if ($.scope.todos4.length > 0) {
        const item = $.scope.todos4.shift();
        updateTodoLength();
        console.log('Shifted:', item);
    } else {
        alert('No items to shift!');
    }
}

function todoReverse() {
    $.scope.todos4.reverse();
}

function todoSplice() {
    if ($.scope.todos4.length >= 2) {
        const removed = $.scope.todos4.splice(1, 1);
        updateTodoLength();
        console.log('Removed:', removed);
    } else {
        alert('Need at least 2 items to splice the 2nd one!');
    }
}

function updateTodoLength() {
    $('#todo-length').text($.scope.todos4.length);
}

// ===== DEMO 5: REDDIT API =====

function loadReddit() {
    const subreddit = $('#subreddit-select').val();
    const url = subreddit
        ? `https://www.reddit.com/r/${subreddit}/.json`
        : 'https://www.reddit.com/.json';

    // Clear existing posts
    $.scope.reddit.empty();

    // Show loading state
    $('#reddit-area').addClass('loading');

    $.ajax({
        url: url,
        dataType: 'json',
        success: function(data) {
            $('#reddit-area').removeClass('loading');

            if (data && data.data && data.data.children) {
                data.data.children.forEach(function (post) {
                    $.scope.reddit.push(post.data);
                });
            }
        },
        error: function(xhr, status, error) {
            $('#reddit-area').removeClass('loading');
            console.error('Reddit API error:', error);
            alert('Failed to load Reddit posts. This might be due to CORS restrictions. Try a CORS proxy or view in JSFiddle.');
        }
    });
}

function clearReddit() {
    $.scope.reddit.empty();
}
