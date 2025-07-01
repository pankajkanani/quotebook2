$(document).ready(function() {
  // Fetch categories (sheet names)
  function loadCategories() {
    $.ajax({
      url: 'https://script.google.com/macros/s/AKfycbwLeesyNBCPPM-Zx24ZJlsSaNcr2Q0bJaMJiXJIjshE8EnPjBeQgZjOf6Cy7XD_SpuSFQ/exec?mode=listSheets',
      method: 'GET',
      success: function(data) {
        if (Array.isArray(data)) {
          renderCategories(data);
        } else if (data.sheets) {
          renderCategories(data.sheets);
        }
      },
      error: function() {
        $('#categories').html('<span style="color:red">Failed to load categories.</span>');
      }
    });
  }

  // Render category buttons with slider arrows
  function renderCategories(categories) {
    var html = '';
    html += '<button class="category-slider-arrow left" style="display:none;">&#8592;</button>';
    html += '<div class="categories-inner" style="display:flex;flex-wrap:nowrap;gap:0.5rem;width:100%;overflow-x:auto;">';
    categories.forEach(function(cat, idx) {
      html += `<button class="category-btn animate__animated animate__fadeInDown" data-category="${cat}" style="animation-delay:${idx*0.05}s;">${cat}</button>`;
    });
    html += '</div>';
    html += '<button class="category-slider-arrow right">&#8594;</button>';
    $('#categories').html(html);
    // Auto-load first category
    if (categories.length > 0) {
      currentCategory = categories[0];
      currentPage = 1;
      loadMessages(currentCategory, currentPage, limit, false);
      $(`.category-btn[data-category='${categories[0]}']`).addClass('active');
    }
    updateCategorySliderArrows();
  }

  // Update arrow visibility
  function updateCategorySliderArrows() {
    var $inner = $('.categories-inner');
    var $left = $('.category-slider-arrow.left');
    var $right = $('.category-slider-arrow.right');
    if ($inner.length === 0) return;
    var scrollLeft = $inner[0].scrollLeft;
    var maxScroll = $inner[0].scrollWidth - $inner[0].clientWidth;
    $left.css('display', scrollLeft > 5 ? 'flex' : 'none');
    $right.css('display', scrollLeft < maxScroll - 5 ? 'flex' : 'none');
  }

  var currentCategory = null;
  var currentPage = 1;
  var limit = 10;
  var allMessages = [];
  var totalMessages = 0;
  var maxPage = 1;

  // Fetch and render messages for a category
  function loadMessages(category, page = 1, limitVal = 10, append = false, showPagination = true) {
    // Show custom loader inside container
    $('#messages').empty();
    $('#pagination').remove();
    $('#messages').append('<div id="main-loader"><span class="loader"></span></div>');
    allMessages = [];
    totalMessages = 0;
    $.ajax({
      url: `https://script.google.com/macros/s/AKfycbwLeesyNBCPPM-Zx24ZJlsSaNcr2Q0bJaMJiXJIjshE8EnPjBeQgZjOf6Cy7XD_SpuSFQ/exec?sheet=${encodeURIComponent(category)}&page=${page}&limit=${limitVal}`,
      method: 'GET',
      success: function(data) {
        var messages = data && data.data && Array.isArray(data.data) ? data.data : data;
        if (!Array.isArray(messages)) messages = [];
        allMessages = messages;
        totalMessages = data.total || allMessages.length;
        maxPage = Math.ceil(totalMessages / limitVal) || 1;
        renderMessages(allMessages, totalMessages);
        if (showPagination) {
          renderPagination(page, maxPage);
        }
      },
      error: function() {
        showSplashScreen('Failed to load messages. Please check your connection or try again.');
        $('#pagination').remove();
      }
    });
  }

  // Splash screen for no data or error
  function showSplashScreen(message) {
    $('#messages').empty();
    $('#messages').append(`
      <div class="splash-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:220px;">
        <div style="font-size:3.5rem;line-height:1;">😕</div>
        <div style="font-size:1.3rem;font-weight:500;margin:1rem 0 0.5rem 0;color:#4e54c8;">Oops! No Data</div>
        <div style="color:#888;font-size:1.05rem;text-align:center;max-width:90vw;">${message || 'No messages found for this category.'}</div>
        <button class="category-btn" style="margin-top:1.5rem;" onclick="location.reload()">🔄 Reload</button>
      </div>
    `);
  }

  // Render messages
  function renderMessages(messages, total) {
    if (!messages || !messages.length) {
      showSplashScreen();
      return;
    }
    var html = '';
    messages.forEach(function(msg, idx) {
      var text = msg.value ? msg.value : msg;
      var encodedText = encodeURIComponent(text);
      html += `<div class="message-card animate__animated animate__fadeInUp" style="animation-delay:${idx*0.07}s;">
        <div class="message-text">${text.replace(/\n/g, '<br>')}</div>
        <div class="message-actions">
          <button class="copy-btn animate__animated animate__pulse" data-text="${encodedText}" title="Copy"><i class="fa-regular fa-copy"></i></button>
          <a class="wa-share-btn animate__animated animate__pulse" href="https://wa.me/?text=${encodedText}" target="_blank" title="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
          <a class="fb-share-btn animate__animated animate__pulse" href="https://www.facebook.com/sharer/sharer.php?u=&quote=${encodedText}" target="_blank" title="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
          <a class="x-share-btn animate__animated animate__pulse" href="https://twitter.com/intent/tweet?text=${encodedText}" target="_blank" title="Share on X (Twitter)"><i class="fab fa-x-twitter"></i></a>
        </div>
      </div>`;
    });
    $('#messages').html(html);
  }

  // Copy to clipboard functionality
  $(document).on('click', '.copy-btn', function() {
    var btn = $(this);
    var text = decodeURIComponent(btn.data('text'));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var original = btn.html();
        btn.html('✅');
        setTimeout(function() { btn.html(original); }, 1200);
      }, function() {
        var original = btn.html();
        btn.html('❌');
        setTimeout(function() { btn.html(original); }, 1200);
      });
    } else {
      // Fallback for older browsers
      var temp = $('<textarea>');
      $('body').append(temp);
      temp.val(text).select();
      document.execCommand('copy');
      temp.remove();
      var original = btn.html();
      btn.html('✅ Copied!');
      setTimeout(function() { btn.html(original); }, 1200);
    }
  });

  // Add per-page selector UI
  function renderPerPageSelector() {
    if ($('#perPageSelector').length) return;
    var html = '<div id="perPageSelector" style="text-align:center;margin-bottom:1rem;">';
    html += 'Show <select id="perPageSelect">';
    [5, 10, 20, 50, 100].forEach(function(val) {
      html += `<option value="${val}"${val === limit ? ' selected' : ''}>${val}</option>`;
    });
    html += '</select> per page</div>';
    // Place per-page selector below messages, above pagination
    if ($('#pagination').length) {
      $('#pagination').before(html);
    } else {
      $('#messages').after(html);
    }
  }

  // Render pagination controls
  function renderPagination(current, max) {
    if (max <= 1) {
      $('#pagination').remove();
      $('#perPageSelector').remove();
      return;
    }
    var html = '<div id="pagination" style="text-align:center;margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:center;">';
    html += `<button class="page-btn" data-page="${current - 1}"${current === 1 ? ' disabled' : ''}>◀ Prev</button>`;
    // Show up to 2 pages before and after current
    var start = Math.max(1, current - 1);
    var end = Math.min(max, current + 1);
    if (start > 1) html += '<span style="margin:0 2px;">...</span>';
    for (var i = start; i <= end; i++) {
      html += `<button class="page-btn${i === current ? ' active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (end < max) html += '<span style="margin:0 2px;">...</span>';
    html += `<button class="page-btn" data-page="${current + 1}"${current === max ? ' disabled' : ''}>Next ▶</button>`;
    html += `<span style="margin-left:8px;">Go to <input id="gotoPageInput" type="number" min="1" max="${max}" value="${current}" style="width:50px;"> / ${max}</span>`;
    html += '</div>';
    if ($('#pagination').length) {
      $('#pagination').replaceWith(html);
    } else {
      $('#messages').after(html);
    }
    // Render per-page selector below messages, above pagination
    if (!$('#perPageSelector').length) {
      renderPerPageSelector();
    }
  }

  // Per-page selector change
  $(document).on('change', '#perPageSelect', function() {
    limit = parseInt($(this).val());
    currentPage = 1;
    loadMessages(currentCategory, currentPage, limit, false, true);
  });

  // Jump to page input
  $(document).on('change', '#gotoPageInput', function() {
    var page = parseInt($(this).val());
    if (!isNaN(page) && page >= 1 && page <= maxPage && page !== currentPage) {
      currentPage = page;
      loadMessages(currentCategory, currentPage, limit, false, true);
    }
  });

  // Category button click
  $('#categories').on('click', '.category-btn', function() {
    $('.category-btn').removeClass('active');
    $(this).addClass('active');
    var category = $(this).data('category');
    currentCategory = category;
    currentPage = 1;
    loadMessages(currentCategory, currentPage, limit, false);
  });

  // Page button click
  $(document).on('click', '.page-btn', function() {
    var page = parseInt($(this).data('page'));
    if (!isNaN(page) && page >= 1 && page <= maxPage && page !== currentPage) {
      currentPage = page;
      loadMessages(currentCategory, currentPage, limit, false, true);
    }
  });

  // Arrow click handlers
  $(document).on('click', '.category-slider-arrow.left', function() {
    var $inner = $('.categories-inner');
    $inner.animate({ scrollLeft: $inner.scrollLeft() - 120 }, 200, updateCategorySliderArrows);
  });
  $(document).on('click', '.category-slider-arrow.right', function() {
    var $inner = $('.categories-inner');
    $inner.animate({ scrollLeft: $inner.scrollLeft() + 120 }, 200, updateCategorySliderArrows);
  });
  // Update arrows on scroll
  $(document).on('scroll', '.categories-inner', updateCategorySliderArrows);

  // Initial load
  function initialLoad() {
    loadCategories();
    renderPerPageSelector();
    currentCategory = null;
    currentPage = 1;
  }
  initialLoad();

  // Hide splash loader after 20 seconds
  $(function() {
    setTimeout(function() {
      $('#container-loader-overlay').fadeOut(100);
    }, 6000);
  });
});
