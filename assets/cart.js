function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems =
        this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
    const gift_form_minicart = document.getElementById('gift_form_minicart');
    if (gift_form_minicart) {
      gift_form_minicart.addEventListener('change', (event) => {
        if (event.currentTarget.checked) {
          this.addGiftwrapCartClick(gift_form_minicart);
        } else {
          this.updateQuantity(event.currentTarget.dataset.index, 0);
        }
      });
    }
    document
      .querySelectorAll('.js-addtocart-page')
      .forEach((upsell) =>
        upsell.addEventListener('click', this.addProductUpSellEvent.bind(this))
      );
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.dataset.key,
      event.target.value,
      document.activeElement.getAttribute('name'),
      event.target
    );
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, key, quantity, name, target) {
    quantity = quantity ? quantity : 0;
    const selector = `cart-remove-button[data-index="${line}"]`;
    const cart_item = this.querySelector(selector);
    cart_item?.classList.add('loading');
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        if (parsedState.errors) {
          this.updateMessageErrors(line, parsedState.errors, target);
          this.disableLoading();
          return;
        }
        if (parsedState.item_count != undefined) {
          document.querySelectorAll('.cart-count').forEach((el) => {
            if (el.classList.contains('cart-count-drawer')) {
              el.innerHTML = `(${parsedState.item_count})`;
            } else {
              el.innerHTML =
                parsedState.item_count > 100 ? '~' : parsedState.item_count;
            }
          });
          if (document.querySelector('header-total-price')) {
            document
              .querySelector('header-total-price')
              .updateTotal(parsedState);
          }
        }
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById('main-cart-items').dataset.id
          ],
          'text/html'
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector('#main-cart-items');
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              '#main-cart-items'
            );
          });
        } else {
          const title =
            parsedState.items_added[0]?.product_title ||
            parsedState.items_removed[0]?.product_title;

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          setTimeout(() => {
            if (quantity > 0) {
              this.toastSuccess(window.variantStrings.addSuccess);
            } else {
              this.toastSuccess(window.variantStrings.removeCartItem);
            }
          }, 20);
          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById('main-cart-items').dataset.id
            ],
            '.cart-info .totals'
          );
          const totals_content = document.querySelector('.cart-info .totals');
          if (totals && totals_content) totals_content.innerHTML = totals;
          const cart_gift_html = html.getElementById('gift');
          const cart_gift = document.getElementById('gift');

          if (cart_gift) {
            cart_gift.innerHTML = cart_gift_html.innerHTML;
            console.log(cart_gift_html);
            const gift_form_minicart =
              document.getElementById('gift_form_minicart');
            if (gift_form_minicart) {
              gift_form_minicart.addEventListener('change', (event) => {
                if (event.currentTarget.checked) {
                  this.addGiftwrapCartClick(gift_form_minicart);
                } else {
                  this.updateQuantity(event.currentTarget.dataset.index, 0);
                }
              });
            }
          }
          const cart_free_ship = document.querySelector(
            'free-ship-progress-bar'
          );
          if (cart_free_ship) {
            cart_free_ship.init(parsedState.items_subtotal_price);
          }
          this.updateLiveRegions(line, key, parsedState.item_count);
        }
        // let gift_card_product = this.querySelector(`cart-remove-button#${gift_form_minicart.dataset.variantId}`);
        // gift_form_minicart
        this.disableLoading();
      })
      .catch((e) => {
        console.error(e);
        this.disableLoading();
      })
      .finally(() => {
        BlsLazyloadImg.init();
        cart_item?.classList.remove('loading');
      });
  }

  updateLiveRegions(line, key, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`);
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`);
      for (var item of document.querySelectorAll('.cart-item__error-text')) {
        item.classList.remove('error');
      }
      if (lineItemError) {
        {
          lineItemError
            .querySelector(`.cart-item__error-text-${key}`)
            .classList.add('error');
          lineItemError.querySelector(
            `.cart-item__error-text-${key}`
          ).innerHTML = window.cartStrings.quantityError.replace(
            '[quantity]',
            quantityElement.value
          );
        }
      }
    }

    this.currentItemCount = itemCount;
  }

  updateMessageErrors(line, message, target) {
    const val = target.dataset.value;
    target.value = val;
    var wrapperDiv = document.createElement('div');
    var messageDiv = document.createElement('div');
    messageDiv.className = `mt-10 line-item-error-${line} error form__message inline-flex align-center`;
    messageDiv.setAttribute('tabindex', '-1');
    messageDiv.innerHTML = `
  <svg width="18" height="18" fill="none" class="flex-auto">
    <g stroke="#D0473E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3">
      <path d="M7.977 1.198c.573-.482 1.498-.482 2.054 0l1.293 1.105a1.89 1.89 0 0 0 1.039.376h1.39c.868 0 1.58.712 1.58 1.58v1.39c0 .328.171.786.376 1.031l1.105 1.293c.482.573.482 1.497 0 2.054l-1.105 1.292c-.204.246-.376.704-.376 1.031v1.391c0 .867-.712 1.58-1.58 1.58h-1.39c-.328 0-.786.171-1.031.376L10.039 16.8c-.573.483-1.497.483-2.054 0l-1.292-1.104c-.246-.205-.712-.377-1.031-.377H4.23c-.867 0-1.58-.712-1.58-1.579v-1.399c0-.319-.163-.785-.367-1.023l-1.105-1.3c-.474-.565-.474-1.481 0-2.046l1.105-1.3c.204-.246.368-.705.368-1.024V4.267c0-.868.712-1.58 1.579-1.58h1.415c.328 0 .786-.171 1.031-.376l1.301-1.113ZM7 11l4-4M11 11 7 7"/>
    </g>
  </svg>
`;
    var span = document.createElement('span');
    span.className = 'ml-5';
    span.textContent = message;
    messageDiv.appendChild(span);
    wrapperDiv.appendChild(messageDiv);
    showToast(wrapperDiv.innerHTML, 5000, 'modal-error');
  }

  addGiftwrapCartClick(event) {
    const target = event;
    const variant_id = target.getAttribute('data-variant-id');
    const body = JSON.stringify({
      id: Number(variant_id),
      quantity: 1,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        fetch('/cart.json')
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll('.cart-count').forEach((el) => {
                if (el.classList.contains('cart-count-drawer')) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count > 100 ? '~' : cart.item_count;
                }
              });
              if (document.querySelector('header-total-price')) {
                document.querySelector('header-total-price').updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                'free-ship-progress-bar'
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById('main-cart-items').dataset.id
          ],
          'text/html'
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector('.cart-wrapper');
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              '.cart-wrapper'
            );
          });
        } else {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });

          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById('main-cart-items').dataset.id
            ],
            '.cart-info .totals'
          );
          const totals_content = document.querySelector('.cart-info .totals');
          if (totals && totals_content) totals_content.innerHTML = totals;
          const cart_gift_html = html.getElementById('gift');
          const cart_gift = document.getElementById('gift');
          if (cart_gift) {
            cart_gift.innerHTML = cart_gift_html.innerHTML;
            const gift_form_minicart =
              document.getElementById('gift_form_minicart');
            if (gift_form_minicart) {
              gift_form_minicart.addEventListener('change', (event) => {
                if (event.currentTarget.checked) {
                  this.addGiftwrapCartClick(gift_form_minicart);
                } else {
                  this.updateQuantity(event.currentTarget.dataset.index, 0);
                  return;
                }
              });
            }
          }
        }
        this.disableLoading();
        BlsLazyloadImg.init();
        setTimeout(() => {
          this.toastSuccess(window.variantStrings.addGiftCard);
        }, 20);
      })
      .catch(() => {
        this.disableLoading();
      });
  }

  toastSuccess(message) {
    var wrapperDiv = document.createElement('div');
    var messageDiv = document.createElement('div');
    messageDiv.className = `mt-10 newsletter-form__message--success success form__message inline-flex align-center`;
    messageDiv.setAttribute('tabindex', '-1');
    messageDiv.innerHTML = `
   <svg width="18" height="18" fill="none">
  <g stroke="#137F24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3"><path d="m6.033 8.992 1.972 1.98 3.952-3.96"/><path d="M7.973 1.178c.565-.482 1.49-.482 2.062 0l1.293 1.113c.245.213.704.385 1.03.385h1.392c.867 0 1.579.712 1.579 1.579v1.39c0 .32.172.786.384 1.032l1.113 1.292c.483.565.483 1.49 0 2.062l-1.113 1.293a1.813 1.813 0 0 0-.384 1.03v1.392c0 .867-.712 1.579-1.58 1.579h-1.39c-.32 0-.786.172-1.031.384l-1.293 1.113c-.564.483-1.489.483-2.062 0L6.681 15.71a1.813 1.813 0 0 0-1.031-.384H4.234c-.867 0-1.579-.712-1.579-1.58v-1.398c0-.32-.172-.778-.376-1.023l-1.105-1.301c-.474-.565-.474-1.48 0-2.045L2.28 6.677c.204-.246.376-.704.376-1.023V4.247c0-.868.712-1.58 1.58-1.58H5.65c.319 0 .785-.171 1.03-.384l1.293-1.105Z"/></g>
</svg>
  `;
    var span = document.createElement('span');
    span.className = 'ml-5';
    span.textContent = message;
    messageDiv.appendChild(span);
    wrapperDiv.appendChild(messageDiv);
    showToast(wrapperDiv.innerHTML, 2000, 'modal-success');
  }

  toastError(message) {
    var wrapperDiv = document.createElement('div');
    var messageDiv = document.createElement('div');
    messageDiv.className = `mt-10 line-item-error-${1} error form__message inline-flex align-center`;
    messageDiv.setAttribute('tabindex', '-1');
    messageDiv.innerHTML = `
    <svg width="18" height="18" fill="none" class="flex-auto">
      <g stroke="#D0473E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3">
        <path d="M7.977 1.198c.573-.482 1.498-.482 2.054 0l1.293 1.105a1.89 1.89 0 0 0 1.039.376h1.39c.868 0 1.58.712 1.58 1.58v1.39c0 .328.171.786.376 1.031l1.105 1.293c.482.573.482 1.497 0 2.054l-1.105 1.292c-.204.246-.376.704-.376 1.031v1.391c0 .867-.712 1.58-1.58 1.58h-1.39c-.328 0-.786.171-1.031.376L10.039 16.8c-.573.483-1.497.483-2.054 0l-1.292-1.104c-.246-.205-.712-.377-1.031-.377H4.23c-.867 0-1.58-.712-1.58-1.579v-1.399c0-.319-.163-.785-.367-1.023l-1.105-1.3c-.474-.565-.474-1.481 0-2.046l1.105-1.3c.204-.246.368-.705.368-1.024V4.267c0-.868.712-1.58 1.579-1.58h1.415c.328 0 .786-.171 1.031-.376l1.301-1.113ZM7 11l4-4M11 11 7 7"/>
      </g>
    </svg>
  `;
    var span = document.createElement('span');
    span.className = 'ml-5';
    span.textContent = message;
    messageDiv.appendChild(span);
    wrapperDiv.appendChild(messageDiv);

    showToast(wrapperDiv.innerHTML, 2000, 'modal-error');
  }

  addProductUpSellEvent(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const variant_id = target
      .closest('.product-addtocart-js')
      .getAttribute('data-product-variant-id');
    const body = JSON.stringify({
      id: Number(variant_id),
      quantity: 1,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        fetch('/cart.json')
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll('.cart-count').forEach((el) => {
                if (el.classList.contains('cart-count-drawer')) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count > 100 ? '~' : cart.item_count;
                }
              });
              if (document.querySelector('header-total-price')) {
                document.querySelector('header-total-price').updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                'free-ship-progress-bar'
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById('main-cart-items').dataset.id
          ],
          'text/html'
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector('.cart-wrapper');
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              '.cart-wrapper'
            );
          });
        } else {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });

          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById('main-cart-items').dataset.id
            ],
            '.cart__footer .totals'
          );
          const totals_content = document.querySelector(
            '.cart__footer .totals'
          );
          if (totals && totals_content) totals_content.innerHTML = totals;
        }
      })
      .catch(() => {
        this.disableLoading();
      });
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document.body.classList.add('start', 'loading');
    document.activeElement.blur();
  }

  disableLoading() {
    // document.body.classList.add('finish');
    // setTimeout(function () {
    //   document.body.classList.remove('start', 'loading', 'finish');
    // }, 500);
  }
}
customElements.define('cart-items', CartItems);

class CartPageUpsell extends CartItems {
  constructor() {
    super();
  }
  init() {
    this.connectedCallback();
  }
  connectedCallback() {
    fetch(this.dataset.url)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('.swiper-wrapper');
        if (recommendations && recommendations.innerHTML.trim().length) {
          this.querySelector('.swiper-wrapper').innerHTML =
            recommendations.innerHTML;
        }
      })
      .finally(() => {
        BlsSettingsSwiper.init();
        BlsLazyloadImg.init();
        document
          .querySelectorAll('.js-addtocart-page')
          .forEach((upsell) =>
            upsell.addEventListener(
              'click',
              this.addProductUpSellEvent.bind(this)
            )
          );
      })
      .catch((e) => {
        console.error(e);
      });
  }
}
customElements.define('minicart-recommendations-page', CartPageUpsell);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();
        this.addEventListener(
          'change',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, 300)
        );
      }
    }
  );
}

class CartEstimate extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button[ data-action="shipping"]');
    this.init();
  }
  init() {
    var _this = this;
    this.button.addEventListener('click', _this.onclick.bind(_this));
    this.addonsUpdate();
  }
  addonsUpdate() {
    const address_country = document.getElementById('address_country');
    const address_province = document.getElementById('address_province');
    if (address_country && address_province) {
      new Shopify.CountryProvinceSelector(
        'address_country',
        'address_province',
        { hideElement: 'address_province_container' }
      );
    }

    const discount_code = document.querySelector('.discount_code');
    const code = localStorage.getItem('discount_code');
    if (code && discount_code) {
      document.querySelector('.discount_code').value = code;
    }
  }
  onclick() {
    var e = {};
    (e.zip = document.querySelector('#AddressZip').value || ''),
      (e.country = document.querySelector('#address_country').value || ''),
      (e.province = document.querySelector('#address_province').value || ''),
      this.getCartShippingRatesForDestination(e);
  }
  getCartShippingRatesForDestination(event) {
    fetch(
      `${window.Shopify.routes.root}cart/shipping_rates.json?shipping_address%5Bzip%5D=${event.zip}&shipping_address%5Bcountry%5D=${event.country}&shipping_address%5Bprovince%5D=${event.province}`
    )
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const message = document.querySelector('.addon-message');
        for (var item of document.querySelectorAll('.addon-message p')) {
          item.remove();
        }
        const { showDeliveryDays, deliveryDayOne, deliveryDaysOther } =
          message.dataset;
        const parsedState = JSON.parse(state);
        if (parsedState && parsedState.shipping_rates) {
          if (parsedState.shipping_rates.length > 0) {
            message.classList.remove('error', 'warning');
            message.classList.add('success');
            const p = document.createElement('p');
            p.innerText = cartStrings?.shipping_rate.replace(
              '{{address}}',
              event.zip + ', ' + event.country + ' ' + event.province
            );
            message.appendChild(p);
            parsedState.shipping_rates.map((rate) => {
              let daysShipping = '';
              if (rate.delivery_days.length > 0 && showDeliveryDays == 'true') {
                let typeDay = deliveryDayOne;
                const day = rate.delivery_days[0];
                const dayAt = rate.delivery_days.at(-1);
                if (day > 1) typeDay = deliveryDaysOther;
                if (day === dayAt) {
                  daysShipping = `(${day} ${typeDay})`;
                } else {
                  daysShipping = `(${day} - ${dayAt} ${typeDay})`;
                }
              }
              const rateNode = document.createElement('p');
              rateNode.innerHTML =
                rate.name +
                ': ' +
                Shopify.formatMoney(rate.price, cartStrings?.money_format) +
                ' ' +
                daysShipping;
              message.appendChild(rateNode);
            });
          } else {
            message.classList.remove('error', 'success');
            message.classList.add('warning');
            const p = document.createElement('p');
            p.innerText = cartStrings?.no_shipping;
            message.appendChild(p);
          }
        } else {
          message.classList.remove('success', 'warning');
          message.classList.add('error');
          Object.entries(parsedState).map((error) => {
            const message_error = `${error[1][0]}`;
            const p = document.createElement('p');
            p.innerText = message_error;
            message.appendChild(p);
          });
        }
      })
      .catch((error) => {
        throw error;
      });
  }
}
customElements.define('cart-estimate', CartEstimate);
