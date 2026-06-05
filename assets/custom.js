// =============================================
// Product Card Swiper - with Load More support
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initProductCardSwipers();
  watchForNewProducts();
});

document.addEventListener('shopify:section:load', () => {
  initProductCardSwipers();
});

// ✅ Watch for new products injected by Load More
function watchForNewProducts() {
  const observer = new MutationObserver((mutations) => {
    let hasNewSwiper = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return; // skip non-elements

        // Check if the added node itself is a swiper, or contains one
        const swipers = node.classList?.contains('product-card-swiper')
          ? [node]
          : node.querySelectorAll?.('.product-card-swiper') || [];

        if (swipers.length > 0) hasNewSwiper = true;
      });
    });

    if (hasNewSwiper) {
      // Small delay to let the DOM fully settle
      setTimeout(() => initProductCardSwipers(), 100);
    }
  });

  // Observe the whole document body for any new product cards
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function initProductCardSwipers() {
  document.querySelectorAll('.product-card-swiper').forEach((el) => {
    if (el.swiper) return; // already initialized, skip

    const wrapper = el.closest('.product-swiper-wrapper');
    const pagination = wrapper?.querySelector('.product-swiper-pagination');

    const swiper = new Swiper(el, {
      slidesPerView: 1,
      loop: false,
      grabCursor: true,
      watchOverflow: true,
      threshold: 10,
      preventClicksPropagation: false,
      preventClicks: false,

      pagination: pagination
        ? {
            el: pagination,
            clickable: true,
            bulletClass: 'swiper-pagination-bullet',
            bulletActiveClass: 'swiper-pagination-bullet-active',
          }
        : false,

      on: {
        init(swiper) {
          forceLoadSlide(swiper, 0);
          forceLoadSlide(swiper, 1); // preload second slide
        },
        slideChange(swiper) {
          forceLoadSlide(swiper, swiper.activeIndex);
          forceLoadSlide(swiper, swiper.activeIndex + 1); // preload next
        },
      },
    });
  });
}

function forceLoadSlide(swiper, index) {
  const slide = swiper.slides[index];
  if (!slide) return;

  // 1. Force YOUR THEME's lazy loader classes
  slide.querySelectorAll('.bls-loading-image').forEach((el) => {
    el.classList.remove('bls-loading-image');
    el.classList.add('bls-loaded-image');
  });

  // 2. Force motion-element to be visible
  slide.querySelectorAll('motion-element').forEach((el) => {
    el.style.transform = 'none';
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.removeAttribute('hold');
    el.removeAttribute('data-pending');
  });

  // 3. Force all images to load
  slide.querySelectorAll('img').forEach((img) => {
    if (img.dataset.src && (!img.src || img.src === window.location.href)) {
      img.src = img.dataset.src;
    }
    if (img.dataset.srcset && !img.srcset) {
      img.srcset = img.dataset.srcset;
    }
    if (img.loading === 'lazy') {
      img.loading = 'eager';
    }
    img.classList.remove('bls-loading-image');
    img.classList.add('bls-loaded-image');
  });

  // 4. Hide skeleton placeholders
  slide.querySelectorAll('.loading_image.skeleton, .loading_image').forEach((el) => {
    el.style.display = 'none';
  });

  // 5. Videos
  slide.querySelectorAll('video[data-src]').forEach((video) => {
    if (!video.src) {
      video.src = video.dataset.src;
      video.load();
    }
  });
}
/* ── Card Quantity Picker (bulk-deal style chips: 1/2/5/10 + custom max 20) ── */
(function () {
  function clamp(n) {
    if (isNaN(n) || n < 1) return 1;
    if (n > 20) return 20;
    return Math.floor(n);
  }
  function setActiveChip(root, qty) {
    var matched = false;
    root.querySelectorAll('.cqp__chip').forEach(function (c) {
      var cQty = parseInt(c.dataset.qty, 10);
      var on = cQty === qty;
      if (on) matched = true;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    return matched;
  }
  function syncQty(root, qty) {
    var hidden = root.querySelector('[data-cqp-qty]');
    if (hidden) hidden.value = qty;
  }

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.cqp__chip');
    if (!chip) return;
    var root = chip.closest('[data-cqp]');
    if (!root) return;
    e.preventDefault();
    var qty = parseInt(chip.dataset.qty, 10) || 1;
    setActiveChip(root, qty);
    syncQty(root, qty);
    var custom = root.querySelector('.cqp__custom');
    if (custom) custom.value = '';
  });

  document.addEventListener('input', function (e) {
    var input = e.target.closest('.cqp__custom');
    if (!input) return;
    var root = input.closest('[data-cqp]');
    if (!root) return;
    if (input.value === '') return;
    var v = clamp(parseInt(input.value, 10));
    if (String(v) !== input.value) input.value = v;
    var matched = setActiveChip(root, v);
    if (!matched) {
      root.querySelectorAll('.cqp__chip').forEach(function (c) {
        c.classList.remove('is-active');
        c.setAttribute('aria-checked', 'false');
      });
    }
    syncQty(root, v);
  });

  document.addEventListener('blur', function (e) {
    var input = e.target.closest && e.target.closest('.cqp__custom');
    if (!input) return;
    if (input.value === '') {
      var root = input.closest('[data-cqp]');
      if (root) {
        setActiveChip(root, 1);
        syncQty(root, 1);
      }
    }
  }, true);
})();
