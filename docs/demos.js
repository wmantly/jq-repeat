// Wait for DOM to be ready
$(document).ready(function() {
    console.log('jq-repeat demos loaded!');

    // Pre-populate each todo list with some items
    initAllTodos();
});

function initAllTodos() {
    // Demo 1: Advanced todo list with edit/done
    $.scope.todos1.push(
        {
            task: 'Buy groceries',
            done: false,
            doneButton: '<button class="btn-sm btn-done" onclick="markDone1(this)">Done</button>',
            doneClass: ''
        },
        {
            task: 'Walk the dog',
            done: false,
            doneButton: '<button class="btn-sm btn-done" onclick="markDone1(this)">Done</button>',
            doneClass: ''
        },
        {
            task: 'Finish project report',
            done: false,
            doneButton: '<button class="btn-sm btn-done" onclick="markDone1(this)">Done</button>',
            doneClass: ''
        }
    );

    // Demo 2: Sorted todo list
    $.scope.todos2.push(
        { task: 'Low priority task', priority: 8 },
        { task: 'High priority task', priority: 2 },
        { task: 'Medium priority task', priority: 5 }
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

// ===== DEMO 1: ADVANCED TODO LIST WITH EDIT/DONE =====

function addTodo1() {
    const input = $('#todo-input-1');
    const task = input.val().trim();
    if (task) {
        $.scope.todos1.push({
            task: task,
            done: false,
            doneButton: '<button class="btn-sm btn-done" onclick="markDone1(this)">Done</button>',
            doneClass: ''
        });
        input.val('');
    }
}

function clearTodos1() {
    $.scope.todos1.empty();
}

function markDone1(button) {
    const $el = $(button).scopeGetEl();
    const index = Number($el.attr('jq-repeat-index'));

    $.scope.todos1.update(index, {
        done: true,
        doneButton: '<button class="btn-sm done">✓</button>',
        doneClass: 'done'
    });
}

function editTodo1(button) {
    const $el = $(button).scopeGetEl();
    const index = Number($el.attr('jq-repeat-index'));
    const item = $.scope.todos1.splice(index, 1)[0];

    // Put the task text back in the input
    $('#todo-input-1').val(item.task).focus();
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
    const priority = Number($('#priority-select-2').val());
    if (task) {
        $.scope.todos2.push({ task: task, priority: priority });
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
            alert('Failed to load Reddit posts. This might be due to CORS restrictions.');
        }
    });
}

function clearReddit() {
    $.scope.reddit.empty();
}
