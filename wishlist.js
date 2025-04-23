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
                        
                        alert(response.data.message);
                    }
                },
                error: function() {
                    // Reset button state
                    $button.removeClass('loading');
                    $button.find('.dev-ash-wishlist-icon').html('<i class="far fa-heart"></i>');
                    $button.find('.dev-ash-wishlist-text').text(dev_ash_wishlist.texts.add_to_wishlist);
                    
                    alert(dev_ash_wishlist.texts.error);
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
                        alert(response.data.message);
                        
                        // Enable button
                        $button.prop('disabled', false);
                    }
                },
                error: function() {
                    alert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        },
        
        // Add to cart from wishlist
        addToCartFromWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productId = $button.data('product-id');
            
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
                    nonce: dev_ash_wishlist.nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert(response.data.message);
                        
                        // Refresh cart fragments
                        $(document.body).trigger('wc_fragment_refresh');
                    } else {
                        alert(response.data.message);
                    }
                    
                    // Enable button
                    $button.prop('disabled', false);
                },
                error: function() {
                    alert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        },
        
        // Add all products to cart
        addAllToCart: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productIds = [];
            
            // Get all product IDs from wishlist items
            $('.dev-ash-wishlist-item').each(function() {
                var productId = $(this).data('product-id');
                if (productId) {
                    productIds.push(productId);
                }
            });
            
            if (productIds.length === 0) {
                alert(dev_ash_wishlist.texts.wishlist_empty);
                return;
            }
            
            // Confirm before adding all to cart
            if (!confirm(dev_ash_wishlist.texts.confirm_add_all)) {
                return;
            }
            
            // Disable button
            $button.prop('disabled', true);
            
            // AJAX request
            $.ajax({
                url: dev_ash_wishlist.ajax_url,
                type: 'POST',
                data: {
                    action: 'dev_ash_add_all_to_cart',
                    product_ids: productIds,
                    nonce: dev_ash_wishlist.nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert(response.data.message);
                        
                        // Refresh cart fragments
                        $(document.body).trigger('wc_fragment_refresh');
                    } else {
                        alert(response.data.message);
                    }
                    
                    // Enable button
                    $button.prop('disabled', false);
                },
                error: function() {
                    alert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
        },
        
        // Remove all products from wishlist
        removeAllFromWishlist: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            
            // Confirm before removing all
            if (!confirm(dev_ash_wishlist.texts.confirm_remove_all)) {
                return;
            }
            
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
                    } else {
                        alert(response.data.message);
                    }
                    
                    // Enable button
                    $button.prop('disabled', false);
                },
                error: function() {
                    alert(dev_ash_wishlist.texts.error);
                    
                    // Enable button
                    $button.prop('disabled', false);
                }
            });
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
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        DevAshWishlist.init();
    });
    
})(jQuery);
