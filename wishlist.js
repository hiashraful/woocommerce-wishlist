/**
 * Dev Ash Wishlist JavaScript
 */
(function($) {
    'use strict';
    
    // Wishlist object
    var DevAshWishlist = {
        
        // Initialize
        init: function() {
            this.bindEvents();
            this.initLocalWishlist();
        },
        
        // Bind events
        bindEvents: function() {
            // Add to wishlist button click
            $(document).on('click', '.dev-ash-wishlist-button:not(.in-wishlist)', this.addToWishlist);
            
            // Remove from wishlist button click
            $(document).on('click', '.dev-ash-wishlist-remove', this.removeFromWishlist);
            
            // Add to cart from wishlist button click
            $(document).on('click', '.dev-ash-wishlist-add-to-cart', this.addToCartFromWishlist);
            
            // Add all to cart button click
            $(document).on('click', '.dev-ash-add-all-to-cart', this.addAllToCart);
            
            // Remove all from wishlist button click
            $(document).on('click', '.dev-ash-remove-all', this.removeAllFromWishlist);
            
            // Close popup button click
            $(document).on('click', '.dev-ash-wishlist-popup-close', this.closePopup);
            
            // Close custom alert button
            $(document).on('click', '.dev-ash-custom-alert-close, .dev-ash-custom-alert-button', this.closeCustomAlert);
            
            // Close alert on overlay click
            $(document).on('click', '.dev-ash-custom-alert-overlay', function(e) {
                if ($(e.target).hasClass('dev-ash-custom-alert-overlay')) {
                    DevAshWishlist.closeCustomAlert();
                }
            });
            
            // Remove any existing handlers first
			$(document).off('click', '.dev-ash-quantity-minus');
			$(document).off('click', '.dev-ash-quantity-plus');
			$(document).off('change', '.dev-ash-quantity-input');

			// Then add the handlers
			$(document).on('click', '.dev-ash-quantity-minus', this.decreaseQuantity);
			$(document).on('click', '.dev-ash-quantity-plus', this.increaseQuantity);
			$(document).on('change', '.dev-ash-quantity-input', this.validateQuantity);
            
            // Prevent form submission on enter in quantity input
            $(document).on('keypress', '.dev-ash-quantity-input', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    return false;
                }
            });
            
            // Validate quantity input
            $(document).on('change', '.dev-ash-quantity-input', this.validateQuantity);
        },
        
        // Initialize local wishlist for guest users
        initLocalWishlist: function() {
            if (!dev_ash_wishlist.is_user_logged_in) {
                // Check if localStorage is available
                if (this.isLocalStorageAvailable()) {
                    // If wishlist cookie exists but no localStorage, set localStorage
                    var cookieWishlist = this.getCookieWishlist();
                    if (cookieWishlist.length > 0 && !localStorage.getItem('dev_ash_wishlist')) {
                        localStorage.setItem('dev_ash_wishlist', JSON.stringify(cookieWishlist));
                    }
                }
            }
        },
        
        // Check if localStorage is available
        isLocalStorageAvailable: function() {
            var test = 'test';
            try {
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch(e) {
                return false;
            }
        },
        
        // Get wishlist from cookie
        getCookieWishlist: function() {
            var name = 'dev_ash_wishlist=';
            var decodedCookie = decodeURIComponent(document.cookie);
            var cookieArray = decodedCookie.split(';');
            
            for (var i = 0; i < cookieArray.length; i++) {
                var cookie = cookieArray[i].trim();
                if (cookie.indexOf(name) === 0) {
                    var wishlistJson = cookie.substring(name.length, cookie.length);
                    try {
                        return JSON.parse(wishlistJson);
                    } catch(e) {
                        return [];
                    }
                }
            }
            
            return [];
        },
        
        // Add to wishlist
        addToWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productId = $button.data('product-id');
            
            if (!productId) {
                return;
            }
            
            // Add loading state
            $button.addClass('loading');
            $button.find('.dev-ash-wishlist-icon').html('<span class="dev-ash-wishlist-spinner"></span>');
            $button.find('.dev-ash-wishlist-text').text(dev_ash_wishlist.texts.adding_to_wishlist);
            
            // AJAX request
            $.ajax({
                url: dev_ash_wishlist.ajax_url,
                type: 'POST',
                data: {
                    action: 'dev_ash_add_to_wishlist',
                    product_id: productId,
                    nonce: dev_ash_wishlist.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Update button
                        $button.addClass('in-wishlist');
                        $button.removeClass('loading');
                        
                        // Update icon and text with view wishlist link
                        $button.find('.dev-ash-wishlist-icon').html('<i class="fas fa-heart"></i>');
                        $button.find('.dev-ash-wishlist-text').html(
                            '<a href="' + dev_ash_wishlist.wishlist_page_url + '" class="dev-ash-wishlist-view-link">' + 
                            dev_ash_wishlist.texts.view_wishlist + 
                            '</a>'
                        );
                        
                        // Show popup
                        DevAshWishlist.showPopup(response.data.message);
                        
                        // Update local storage for guest users
                        if (!dev_ash_wishlist.is_user_logged_in && DevAshWishlist.isLocalStorageAvailable()) {
                            var wishlist = localStorage.getItem('dev_ash_wishlist') ? JSON.parse(localStorage.getItem('dev_ash_wishlist')) : [];
                            if (!wishlist.includes(productId)) {
                                wishlist.push(productId);
                                localStorage.setItem('dev_ash_wishlist', JSON.stringify(wishlist));
                            }
                        }
                    } else {
                        // Reset button state
                        $button.removeClass('loading');
                        $button.find('.dev-ash-wishlist-icon').html('<i class="far fa-heart"></i>');
                        $button.find('.dev-ash-wishlist-text').text(dev_ash_wishlist.texts.add_to_wishlist);
                        
                        DevAshWishlist.showCustomAlert(response.data.message);
                    }
                },
                error: function() {
                    // Reset button state
                    $button.removeClass('loading');
                    $button.find('.dev-ash-wishlist-icon').html('<i class="far fa-heart"></i>');
                    $button.find('.dev-ash-wishlist-text').text(dev_ash_wishlist.texts.add_to_wishlist);
                    
                    DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.error);
                }
            });
        },
        
        // Remove from wishlist
        removeFromWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productId = $button.data('product-id');
            var $listItem = $button.closest('.dev-ash-wishlist-item');
            
            if (!productId) {
                return;
            }
            
            // Disable button
            $button.prop('disabled', true);
            
            // AJAX request
            $.ajax({
                url: dev_ash_wishlist.ajax_url,
                type: 'POST',
                data: {
                    action: 'dev_ash_remove_from_wishlist',
                    product_id: productId,
                    nonce: dev_ash_wishlist.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Remove item from list
                        $listItem.fadeOut(300, function() {
                            $(this).remove();
                            
                            // Check if wishlist is empty
                            if ($('.dev-ash-wishlist-item').length === 0) {
                                $('.dev-ash-wishlist-content').html(
                                    '<div class="dev-ash-wishlist-empty">' +
                                    '<p>' + dev_ash_wishlist.texts.wishlist_empty + '</p>' +
                                    '<a href="' + dev_ash_wishlist.shop_url + '" class="button">' + dev_ash_wishlist.texts.browse_products + '</a>' +
                                    '</div>'
                                );
                            }
                        });
                        
                        // Update local storage for guest users
                        if (!dev_ash_wishlist.is_user_logged_in && DevAshWishlist.isLocalStorageAvailable()) {
                            var wishlist = localStorage.getItem('dev_ash_wishlist') ? JSON.parse(localStorage.getItem('dev_ash_wishlist')) : [];
                            wishlist = wishlist.filter(function(id) {
                                return parseInt(id) !== parseInt(productId);
                            });
                            localStorage.setItem('dev_ash_wishlist', JSON.stringify(wishlist));
                        }
                    } else {
                        DevAshWishlist.showCustomAlert(response.data.message);
                        
                        // Enable button
                        $button.prop('disabled', false);
                    }
                },
                error: function() {
                    DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        },
        
		// Decrease quantity
		decreaseQuantity: function(e) {
			e.preventDefault();
			e.stopPropagation(); 
			var $input = $(this).siblings('.dev-ash-quantity-input');
			var currentVal = parseInt($input.val());

			if (!isNaN(currentVal) && currentVal > 1) {
				$input.attr('data-value', currentVal - 1);
			}
		},

		// Increase quantity
		increaseQuantity: function(e) {
			e.preventDefault();
			e.stopPropagation(); 
			var $input = $(this).siblings('.dev-ash-quantity-input');
			var currentVal = parseInt($input.val());
			var max = parseInt($input.attr('max') || 9999);

			if (!isNaN(currentVal) && currentVal < max) {
				$input.attr('data-value', currentVal + 1);
			}
		},

		// Validate quantity
		validateQuantity: function() {
			var $input = $(this);
			var currentVal = parseInt($input.val());
			var min = parseInt($input.attr('min') || 1);
			var max = parseInt($input.attr('max') || 9999);

			// Only adjust value if it's actually invalid
			if (isNaN(currentVal) || currentVal < min) {
				$input.val(min);
			} else if (currentVal > max) {
				$input.val(max);
			}
		},
        
        // Add to cart from wishlist
        addToCartFromWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productId = $button.data('product-id');
            var $listItem = $button.closest('.dev-ash-wishlist-item');
            var $quantityInput = $listItem.find('.dev-ash-quantity-input');
            var quantity = $quantityInput.length ? parseInt($quantityInput.val()) : 1;
            
            if (!productId) {
                return;
            }
            
            // Disable button
            $button.prop('disabled', true);
            
            // AJAX request
            $.ajax({
                url: dev_ash_wishlist.ajax_url,
                type: 'POST',
                data: {
                    action: 'dev_ash_add_to_cart_from_wishlist',
                    product_id: productId,
                    quantity: quantity,
                    nonce: dev_ash_wishlist.nonce,
                    remove_from_wishlist: 1 // Add parameter to remove from wishlist
                },
                success: function(response) {
                    if (response.success) {
                        // Remove item from wishlist
                        $listItem.fadeOut(300, function() {
                            $(this).remove();
                            
                            // Check if wishlist is empty
                            if ($('.dev-ash-wishlist-item').length === 0) {
                                $('.dev-ash-wishlist-content').html(
                                    '<div class="dev-ash-wishlist-empty">' +
                                    '<p>' + dev_ash_wishlist.texts.wishlist_empty + '</p>' +
                                    '<a href="' + dev_ash_wishlist.shop_url + '" class="button">' + dev_ash_wishlist.texts.browse_products + '</a>' +
                                    '</div>'
                                );
                            }
                        });
                        
                        // Update local storage for guest users
                        if (!dev_ash_wishlist.is_user_logged_in && DevAshWishlist.isLocalStorageAvailable()) {
                            var wishlist = localStorage.getItem('dev_ash_wishlist') ? JSON.parse(localStorage.getItem('dev_ash_wishlist')) : [];
                            wishlist = wishlist.filter(function(id) {
                                return parseInt(id) !== parseInt(productId);
                            });
                            localStorage.setItem('dev_ash_wishlist', JSON.stringify(wishlist));
                        }
                        
                        DevAshWishlist.showCustomAlert(response.data.message);
                        
                        // Refresh cart fragments
                        $(document.body).trigger('wc_fragment_refresh');
                    } else {
                        DevAshWishlist.showCustomAlert(response.data.message);
                        
                        // Enable button
                        $button.prop('disabled', false);
                    }
                },
                error: function() {
                    DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        },
        
        // Add all products to cart
addAllToCart: function(e) {
    e.preventDefault();
    var $button = $(this);
    var products = []; // Change from productIds to store both ID and quantity
    
    // Get all product IDs and quantities from wishlist items
    $('.dev-ash-wishlist-item').each(function() {
        var productId = $(this).data('product-id');
        var $quantityInput = $(this).find('.dev-ash-quantity-input');
        var quantity = $quantityInput.length ? parseInt($quantityInput.val()) : 1;
        
        if (productId) {
            // Store as object with both ID and quantity
            products.push({
                id: productId,
                qty: quantity
            });
        }
    });
    
    if (products.length === 0) {
        DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.wishlist_empty);
        return;
    }
    
    // Show confirmation dialog
    DevAshWishlist.showConfirmDialog(
        dev_ash_wishlist.texts.confirm_add_all,
        function() {
            // Disable button
            $button.prop('disabled', true);
            
            // AJAX request
            $.ajax({
                url: dev_ash_wishlist.ajax_url,
                type: 'POST',
                data: {
                    action: 'dev_ash_add_all_to_cart',
                    products: products, // Change to send both IDs and quantities
                    nonce: dev_ash_wishlist.nonce,
                    empty_wishlist: 1 // Add parameter to empty wishlist
                },
                success: function(response) {
                    if (response.success) {
                        DevAshWishlist.showCustomAlert(response.data.message);
                        
                        // Empty the wishlist display
                        $('.dev-ash-wishlist-content').html(
                            '<div class="dev-ash-wishlist-empty">' +
                            '<p>' + dev_ash_wishlist.texts.wishlist_empty + '</p>' +
                            '<a href="' + dev_ash_wishlist.shop_url + '" class="button">' + dev_ash_wishlist.texts.browse_products + '</a>' +
                            '</div>'
                        );
                        
                        // Clear local storage for guest users
                        if (!dev_ash_wishlist.is_user_logged_in && DevAshWishlist.isLocalStorageAvailable()) {
                            localStorage.setItem('dev_ash_wishlist', JSON.stringify([]));
                        }
                        
                        // Refresh cart fragments
                        $(document.body).trigger('wc_fragment_refresh');
                    } else {
                        DevAshWishlist.showCustomAlert(response.data.message);
                    }
                    
                    // Enable button
                    $button.prop('disabled', false);
                },
                error: function() {
                    DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        }
    );
},
        
        // Remove all products from wishlist
        removeAllFromWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            
            // Show confirmation dialog
            DevAshWishlist.showConfirmDialog(
                dev_ash_wishlist.texts.confirm_remove_all,
                function() {
                    // Disable button
                    $button.prop('disabled', true);
                    
                    // AJAX request
                    $.ajax({
                        url: dev_ash_wishlist.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'dev_ash_remove_all_from_wishlist',
                            nonce: dev_ash_wishlist.nonce
                        },
                        success: function(response) {
                            if (response.success) {
                                // Empty wishlist content
                                $('.dev-ash-wishlist-content').html(
                                    '<div class="dev-ash-wishlist-empty">' +
                                    '<p>' + dev_ash_wishlist.texts.wishlist_empty + '</p>' +
                                    '<a href="' + dev_ash_wishlist.shop_url + '" class="button">' + dev_ash_wishlist.texts.browse_products + '</a>' +
                                    '</div>'
                                );
                                
                                // Clear local storage for guest users
                                if (!dev_ash_wishlist.is_user_logged_in && DevAshWishlist.isLocalStorageAvailable()) {
                                    localStorage.setItem('dev_ash_wishlist', JSON.stringify([]));
                                }
                                
                                DevAshWishlist.showCustomAlert(response.data.message);
                            } else {
                                DevAshWishlist.showCustomAlert(response.data.message);
                            }
                            
                            // Enable button
                            $button.prop('disabled', false);
                        },
                        error: function() {
                            DevAshWishlist.showCustomAlert(dev_ash_wishlist.texts.error);
                            
                            // Enable button
                            $button.prop('disabled', false);
                        }
                    });
                }
            );
        },
        
        // Show popup
        showPopup: function(message) {
            // Remove existing popup
            $('.dev-ash-wishlist-popup').remove();
            
            // Create popup HTML
            var popupHtml = 
                '<div class="dev-ash-wishlist-popup">' +
                '<div class="dev-ash-wishlist-popup-content">' +
                '<button class="dev-ash-wishlist-popup-close">&times;</button>' +
                '<p>' + message + '</p>' +
                '<a href="' + dev_ash_wishlist.wishlist_page_url + '" class="button">' + dev_ash_wishlist.texts.view_wishlist + '</a>' +
                '</div>' +
                '</div>';
            
            // Append to body
            $('body').append(popupHtml);
            
            // Show popup
            setTimeout(function() {
                $('.dev-ash-wishlist-popup').addClass('active');
            }, 100);
            
            // Auto close popup after 4 seconds
            setTimeout(function() {
                DevAshWishlist.closePopup();
            }, 4000);
        },
        
        // Close popup
        closePopup: function() {
            $('.dev-ash-wishlist-popup').removeClass('active');
            
            setTimeout(function() {
                $('.dev-ash-wishlist-popup').remove();
            }, 300);
        },
        
        // Show custom alert in the center of the screen
        showCustomAlert: function(message) {
            // Remove any existing alerts
            $('.dev-ash-custom-alert-overlay').remove();
            
            // Create alert HTML
            var alertHtml = 
                '<div class="dev-ash-custom-alert-overlay">' +
                '<div class="dev-ash-custom-alert">' +
                '<button class="dev-ash-custom-alert-close">&times;</button>' +
                '<div class="dev-ash-custom-alert-content">' +
                '<p>' + message + '</p>' +
                '<button class="dev-ash-custom-alert-button">OK</button>' +
                '</div>' +
                '</div>' +
                '</div>';
            
            // Append to body
            $('body').append(alertHtml);
            
            // Show alert
            setTimeout(function() {
                $('.dev-ash-custom-alert-overlay').addClass('active');
            }, 10);
        },
        
        // Close custom alert
        closeCustomAlert: function() {
            $('.dev-ash-custom-alert-overlay').removeClass('active');
            
            setTimeout(function() {
                $('.dev-ash-custom-alert-overlay').remove();
            }, 300);
        },
        
        // Show confirmation dialog
        showConfirmDialog: function(message, callback) {
            // Remove any existing alerts
            $('.dev-ash-custom-alert-overlay').remove();
            
            // Create confirm dialog HTML
            var confirmHtml = 
                '<div class="dev-ash-custom-alert-overlay">' +
                '<div class="dev-ash-custom-alert">' +
                '<button class="dev-ash-custom-alert-close">&times;</button>' +
                '<div class="dev-ash-custom-alert-content">' +
                '<p>' + message + '</p>' +
                '<div class="dev-ash-custom-alert-buttons">' +
                '<button class="dev-ash-custom-alert-cancel">Cancel</button>' +
                '<button class="dev-ash-custom-alert-confirm">Confirm</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
            
            // Append to body
            $('body').append(confirmHtml);
            
            // Show dialog
            setTimeout(function() {
                $('.dev-ash-custom-alert-overlay').addClass('active');
            }, 10);
            
            // Confirm button click
            $('.dev-ash-custom-alert-confirm').on('click', function() {
                DevAshWishlist.closeCustomAlert();
                if (typeof callback === 'function') {
                    callback();
                }
            });
            
            // Cancel button click
            $('.dev-ash-custom-alert-cancel, .dev-ash-custom-alert-close').on('click', function() {
                DevAshWishlist.closeCustomAlert();
            });
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        DevAshWishlist.init();
    });
    
})(jQuery);