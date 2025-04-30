// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main Class for Dev Ash Wishlist functionality
 */
class Dev_Ash_Wishlist {
    
    /**
     * Instance of this class
     */
    protected static $instance = null;
    
    /**
     * Wishlist page ID
     */
    public $wishlist_page_id;
    
    /**
     * Class constructor
     */
    public function __construct() {
        // Get wishlist page ID
        $this->wishlist_page_id = get_option('dev_ash_wishlist_page_id');
        
        // Initialize
        $this->init_hooks();
        
        // Register all shortcodes immediately
        $this->register_shortcodes();
    }
    
    /**
     * Get class instance
     */
    public static function get_instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Register scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'register_scripts'));
        
        // Enqueue Font Awesome for wishlist icons
        add_action('wp_enqueue_scripts', array($this, 'enqueue_font_awesome'));
        
        // Register AJAX handlers
        add_action('wp_ajax_dev_ash_add_to_wishlist', array($this, 'ajax_add_to_wishlist'));
        add_action('wp_ajax_nopriv_dev_ash_add_to_wishlist', array($this, 'ajax_add_to_wishlist'));
        
        add_action('wp_ajax_dev_ash_remove_from_wishlist', array($this, 'ajax_remove_from_wishlist'));
        add_action('wp_ajax_nopriv_dev_ash_remove_from_wishlist', array($this, 'ajax_remove_from_wishlist'));
        
        add_action('wp_ajax_dev_ash_add_to_cart_from_wishlist', array($this, 'ajax_add_to_cart_from_wishlist'));
        add_action('wp_ajax_nopriv_dev_ash_add_to_cart_from_wishlist', array($this, 'ajax_add_to_cart_from_wishlist'));
        
        add_action('wp_ajax_dev_ash_add_all_to_cart', array($this, 'ajax_add_all_to_cart'));
        add_action('wp_ajax_nopriv_dev_ash_add_all_to_cart', array($this, 'ajax_add_all_to_cart'));
        
        add_action('wp_ajax_dev_ash_remove_all_from_wishlist', array($this, 'ajax_remove_all_from_wishlist'));
        add_action('wp_ajax_nopriv_dev_ash_remove_all_from_wishlist', array($this, 'ajax_remove_all_from_wishlist'));
        
        // User login hook - to merge wishlist
        add_action('wp_login', array($this, 'merge_wishlists_on_login'), 10, 2);
        
        // Create wishlist page upon plugin activation
        register_activation_hook(__FILE__, array($this, 'create_wishlist_page'));
    }
    
    /**
     * Register all shortcodes
     */
    public function register_shortcodes() {
        // Register shortcodes
        add_shortcode('dev-ash-wishlist', array($this, 'wishlist_button_shortcode'));
        add_shortcode('dev-ash-wishlist-page', array($this, 'wishlist_page_shortcode'));
    }
    
    /**
     * Enqueue Font Awesome
     * Note: This is only needed if your theme or Elementor doesn't already load Font Awesome
     */
    public function enqueue_font_awesome() {
        // Check if Elementor is active, as it already includes Font Awesome
        if (!did_action('elementor/loaded')) {
            wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css', array(), '5.15.4');
        }
    }
    
    /**
     * Register scripts and styles
     */
    public function register_scripts() {
        // Register styles
        wp_enqueue_style('dev-ash-wishlist-style', get_stylesheet_directory_uri() . '/assets/css/wishlist.css', array(), '1.0.0');
        
        // Register scripts
        wp_enqueue_script('dev-ash-wishlist-script', get_stylesheet_directory_uri() . '/assets/js/wishlist.js', array('jquery'), '1.0.0', true);
        
        // Localize script
        wp_localize_script('dev-ash-wishlist-script', 'dev_ash_wishlist', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dev-ash-wishlist-nonce'),
            'is_user_logged_in' => is_user_logged_in(),
            'wishlist_page_url' => $this->wishlist_page_id ? get_permalink($this->wishlist_page_id) : '',
            'shop_url' => esc_url(home_url('/shop/')), // Changed to use home_url for consistent shop URL
            'texts' => array(
                'add_to_wishlist' => __('Add to Wishlist', 'dev-ash-wishlist'),
                'already_in_wishlist' => __('Already in Wishlist', 'dev-ash-wishlist'),
                'adding_to_wishlist' => __('Adding to wishlist', 'dev-ash-wishlist'),
                'view_wishlist' => __('View wishlist', 'dev-ash-wishlist'),
                'product_added' => __('Product added to wishlist.', 'dev-ash-wishlist'),
                'error' => __('Something went wrong. Please try again.', 'dev-ash-wishlist'),
                'wishlist_empty' => __('Your wishlist is empty.', 'dev-ash-wishlist'),
                'browse_products' => __('Browse Products', 'dev-ash-wishlist'),
                'confirm_add_all' => __('Are you sure you want to add all items to cart?', 'dev-ash-wishlist'),
                'confirm_remove_all' => __('Are you sure you want to remove all items from wishlist?', 'dev-ash-wishlist'),
                'add_all_success' => __('All items added to cart ', 'dev-ash-wishlist'),
                'remove_all_success' => __('All items removed from wishlist.', 'dev-ash-wishlist'),
                'add_all_to_cart' => __('Add All to Cart', 'dev-ash-wishlist'),
                'remove_all' => __('Remove All', 'dev-ash-wishlist'),
                'product_added_to_cart' => __('Product added to cart', 'dev-ash-wishlist')
            )
        ));
    }
    
    /**
     * Create wishlist page
     */
    public function create_wishlist_page() {
        $wishlist_page = get_page_by_path('wishlist');
        
        if (!$wishlist_page) {
            $page_id = wp_insert_post(array(
                'post_title' => 'Wishlist',
                'post_content' => '[dev-ash-wishlist-page]',
                'post_status' => 'publish',
                'post_type' => 'page',
                'comment_status' => 'closed'
            ));
            
            if ($page_id) {
                update_option('dev_ash_wishlist_page_id', $page_id);
                $this->wishlist_page_id = $page_id;
            }
        } else {
            update_option('dev_ash_wishlist_page_id', $wishlist_page->ID);
            $this->wishlist_page_id = $wishlist_page->ID;
        }
    }
    
    /**
 * Add all to cart from wishlist
 */
public function ajax_add_all_to_cart() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'dev-ash-wishlist-nonce')) {
        wp_send_json_error(array('message' => __('Security check failed.', 'dev-ash-wishlist')));
    }
    
    // Get products data (IDs and quantities)
    $products = isset($_POST['products']) ? $_POST['products'] : array();
    
    if (empty($products)) {
        wp_send_json_error(array('message' => __('No products to add to cart.', 'dev-ash-wishlist')));
    }
    
    $added_count = 0;
    $added_items_count = 0;
    
    // Add products to cart with their respective quantities
    foreach ($products as $product_data) {
        $product_id = isset($product_data['id']) ? intval($product_data['id']) : 0;
        $quantity = isset($product_data['qty']) ? intval($product_data['qty']) : 1;
        
        // Make sure quantity is at least 1
        $quantity = max(1, $quantity);
        
        $product = wc_get_product($product_id);
        
        if ($product && $product->is_in_stock()) {
            $added = WC()->cart->add_to_cart($product_id, $quantity);
            
            if ($added) {
                $added_count++;
                $added_items_count += $quantity;
            }
        }
    }
    
    // Empty the wishlist if requested
    if (isset($_POST['empty_wishlist']) && $_POST['empty_wishlist']) {
        // Clear wishlist
        if (is_user_logged_in()) {
            update_user_meta(get_current_user_id(), 'dev_ash_wishlist', array());
        } else {
            setcookie('dev_ash_wishlist', json_encode(array()), time() + (30 * DAY_IN_SECONDS), COOKIEPATH, COOKIE_DOMAIN);
        }
    }
    
    if ($added_count > 0) {
        wp_send_json_success(array(
            'message' => sprintf(
                __('%d items added to cart.', 'dev-ash-wishlist'),
                $added_items_count
            ),
            'wishlist_emptied' => true
        ));
    } else {
        wp_send_json_error(array('message' => __('Failed to add products to cart.', 'dev-ash-wishlist')));
    }
}
    
    /**
     * Remove all from wishlist
     */
    public function ajax_remove_all_from_wishlist() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'dev-ash-wishlist-nonce')) {
            wp_send_json_error(array('message' => __('Security check failed.', 'dev-ash-wishlist')));
        }
        
        // Clear wishlist
        if (is_user_logged_in()) {
            // Clear user meta
            update_user_meta(get_current_user_id(), 'dev_ash_wishlist', array());
        } else {
            // Clear cookie
            setcookie('dev_ash_wishlist', json_encode(array()), time() + (30 * DAY_IN_SECONDS), COOKIEPATH, COOKIE_DOMAIN);
        }
        
        wp_send_json_success(array(
            'message' => __('All items removed from wishlist.', 'dev-ash-wishlist')
        ));
    }
    
    /**
     * Wishlist button shortcode
     */
    public function wishlist_button_shortcode($atts) {
        global $product;
        
        // Get current product if in the loop
        if (!$product) {
            $product = wc_get_product(get_the_ID());
        }
        
        // Return if no product
        if (!$product) {
            return '';
        }
        
        $product_id = $product->get_id();
        $is_in_wishlist = $this->is_product_in_wishlist($product_id);
        $button_class = $is_in_wishlist ? 'dev-ash-wishlist-button in-wishlist' : 'dev-ash-wishlist-button';
        
        // Different content based on wishlist status
        if ($is_in_wishlist) {
            $icon_html = '<span class="dev-ash-wishlist-icon"><i class="fas fa-heart"></i></span> ';
            $text_html = '<span class="dev-ash-wishlist-text"><a href="' . esc_url(get_permalink($this->wishlist_page_id)) . '" class="dev-ash-wishlist-view-link">' . esc_html__('View wishlist', 'dev-ash-wishlist') . '</a></span>';
        } else {
            $icon_html = '<span class="dev-ash-wishlist-icon"><i class="far fa-heart"></i></span> ';
            $text_html = '<span class="dev-ash-wishlist-text">' . esc_html__('Add to Wishlist', 'dev-ash-wishlist') . '</span>';
        }
        
        // Generate button HTML
        $html = '<button class="' . esc_attr($button_class) . '" data-product-id="' . esc_attr($product_id) . '">';
        $html .= $icon_html;
        $html .= $text_html;
        $html .= '</button>';
        
        return $html;
    }
    
    /**
     * Wishlist page shortcode
     */
    public function wishlist_page_shortcode() {
        // Get wishlist items
        $wishlist_items = $this->get_wishlist_items();
        
        ob_start();
        
        // Add shop URL to body for JavaScript use
        echo '<script>document.body.dataset.shopUrl = "' . esc_url(home_url('/shop/')) . '";</script>';
        
        if (empty($wishlist_items)) {
            echo '<div class="dev-ash-wishlist-empty">';
            echo '<p>' . __('Your wishlist is empty.', 'dev-ash-wishlist') . '</p>';
            echo '<a href="' . esc_url(home_url('/shop/')) . '" class="button">' . __('Browse Products', 'dev-ash-wishlist') . '</a>';
            echo '</div>';
        } else {
            echo '<div class="dev-ash-wishlist-content">';
            echo '<h2>' . __('My Wishlist', 'dev-ash-wishlist') . '</h2>';
            echo '<ul class="dev-ash-wishlist-products">';
            
            foreach ($wishlist_items as $product_id) {
                $product = wc_get_product($product_id);
                
                if (!$product) {
                    continue;
                }
                
                echo '<li class="dev-ash-wishlist-item" data-product-id="' . esc_attr($product_id) . '">';
                
                // Product image
                echo '<div class="dev-ash-wishlist-product-image">';
                echo $product->get_image('thumbnail');
                echo '</div>';
                
                // Product info
                echo '<div class="dev-ash-wishlist-product-info">';
                echo '<h3><a href="' . esc_url($product->get_permalink()) . '">' . esc_html($product->get_name()) . '</a></h3>';
                echo '<div class="dev-ash-wishlist-product-price">' . $product->get_price_html() . '</div>';
                
                // Stock status
                echo '<div class="dev-ash-wishlist-product-stock">';
                if ($product->is_in_stock()) {
                    echo '<span class="in-stock">' . __('In Stock', 'dev-ash-wishlist') . '</span>';
                } else {
                    echo '<span class="out-of-stock">' . __('Out of Stock', 'dev-ash-wishlist') . '</span>';
                }
                echo '</div>';
                
                echo '</div>';
                
                // Product actions
                echo '<div class="dev-ash-wishlist-product-actions">';
                
                // Add to cart button with quantity
                if ($product->is_in_stock()) {
                    // Quantity input
                    echo '<div class="dev-ash-quantity-wrapper">';
                    echo '<button class="dev-ash-quantity-minus">-</button>';
                    echo '<input type="number" class="dev-ash-quantity-input" value="1" min="1" max="99">';
                    echo '<button class="dev-ash-quantity-plus">+</button>';
                    echo '</div>';
                    
                    echo '<button class="dev-ash-wishlist-add-to-cart" data-product-id="' . esc_attr($product_id) . '">' . __('ADD TO CART', 'dev-ash-wishlist') . '</button>';
                }
                
                // Remove from wishlist button
                echo '<button class="dev-ash-wishlist-remove" data-product-id="' . esc_attr($product_id) . '">' . __('Remove', 'dev-ash-wishlist') . '</button>';
                
                echo '</div>';
                
                echo '</li>';
            }
            
            echo '</ul>';
            
            // Bulk action buttons
            echo '<div class="dev-ash-wishlist-bulk-actions">';
            echo '<button class="dev-ash-add-all-to-cart">' . __('Add All to Cart', 'dev-ash-wishlist') . '</button>';
            echo '<button class="dev-ash-remove-all">' . __('Remove All', 'dev-ash-wishlist') . '</button>';
            echo '</div>';
            
            echo '</div>';
        }
        
        return ob_get_clean();
    }
    
    /**
     * Check if product is in wishlist
     */
    public function is_product_in_wishlist($product_id) {
        $wishlist_items = $this->get_wishlist_items();
        return in_array((int)$product_id, array_map('intval', $wishlist_items));
    }
    
    /**
     * Get wishlist items
     */
    public function get_wishlist_items() {
        if (is_user_logged_in()) {
            // Get wishlist from user meta
            $user_id = get_current_user_id();
            $wishlist = get_user_meta($user_id, 'dev_ash_wishlist', true);
            
            if (!$wishlist) {
                $wishlist = array();
            }
        } else {
            // Get wishlist from cookie
            if (isset($_COOKIE['dev_ash_wishlist'])) {
                $wishlist = json_decode(stripslashes($_COOKIE['dev_ash_wishlist']), true);
            } else {
                $wishlist = array();
            }
        }
        
        return is_array($wishlist) ? array_map('intval', $wishlist) : array(); // Ensure proper integer values
    }
    
    /**
     * Add to wishlist via AJAX
     */
    public function ajax_add_to_wishlist() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'dev-ash-wishlist-nonce')) {
            wp_send_json_error(array('message' => __('Security check failed.', 'dev-ash-wishlist')));
        }
        
        // Get product ID
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if (!$product_id) {
            wp_send_json_error(array('message' => __('Invalid product.', 'dev-ash-wishlist')));
        }
        
        // Add to wishlist
        $added = $this->add_to_wishlist($product_id);
        
        if ($added) {
            wp_send_json_success(array(
                'message' => __('Product added to wishlist.', 'dev-ash-wishlist'),
                'in_wishlist' => true
            ));
        } else {
            wp_send_json_error(array('message' => __('Product is already in wishlist.', 'dev-ash-wishlist')));
        }
    }
    
    /**
     * Remove from wishlist via AJAX
     */
    public function ajax_remove_from_wishlist() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'dev-ash-wishlist-nonce')) {
            wp_send_json_error(array('message' => __('Security check failed.', 'dev-ash-wishlist')));
        }
        
        // Get product ID
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if (!$product_id) {
            wp_send_json_error(array('message' => __('Invalid product.', 'dev-ash-wishlist')));
        }
        
        // Remove from wishlist
        $removed = $this->remove_from_wishlist($product_id);
        
        if ($removed) {
            wp_send_json_success(array(
                'message' => __('Product removed from wishlist.', 'dev-ash-wishlist'),
                'in_wishlist' => false
            ));
        } else {
            wp_send_json_error(array('message' => __('Failed to remove product from wishlist.', 'dev-ash-wishlist')));
        }
    }
    
    /**
     * Add to cart from wishlist via AJAX
     */
    public function ajax_add_to_cart_from_wishlist() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'dev-ash-wishlist-nonce')) {
            wp_send_json_error(array('message' => __('Security check failed.', 'dev-ash-wishlist')));
        }
        
        // Get product ID and quantity
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
        
        if (!$product_id) {
            wp_send_json_error(array('message' => __('Invalid product.', 'dev-ash-wishlist')));
        }
        
        // Add to cart
        $product = wc_get_product($product_id);
        
        if (!$product) {
            wp_send_json_error(array('message' => __('Product not found.', 'dev-ash-wishlist')));
        }
        
        $added = WC()->cart->add_to_cart($product_id, $quantity);
        
        // If we should remove from wishlist after adding to cart
        if ($added && isset($_POST['remove_from_wishlist']) && $_POST['remove_from_wishlist']) {
            $this->remove_from_wishlist($product_id);
            $message = __('Product added to cart', 'dev-ash-wishlist');
        } else {
            $message = __('Product added to cart.', 'dev-ash-wishlist');
        }
        
        if ($added) {
            wp_send_json_success(array(
                'message' => $message,
                'removed_from_wishlist' => isset($_POST['remove_from_wishlist']) && $_POST['remove_from_wishlist']
            ));
        } else {
            wp_send_json_error(array('message' => __('Failed to add product to cart.', 'dev-ash-wishlist')));
        }
    }
    
    /**
     * Add product to wishlist
     */
    public function add_to_wishlist($product_id) {
        $wishlist = $this->get_wishlist_items();
        
        // Check if product is already in wishlist
        if (in_array((int)$product_id, array_map('intval', $wishlist))) {
            return false;
        }
        
        // Add product to wishlist
        $wishlist[] = (int)$product_id;
        
        // Save wishlist
        $this->save_wishlist($wishlist);
        
        return true;
    }
    
    /**
     * Remove product from wishlist
     */
    public function remove_from_wishlist($product_id) {
        $wishlist = $this->get_wishlist_items();
        
        // Check if product is in wishlist
        if (!in_array((int)$product_id, array_map('intval', $wishlist))) {
            return false;
        }
        
        // Remove product from wishlist
        $wishlist = array_diff($wishlist, array((int)$product_id));
        
        // Save wishlist
        $this->save_wishlist(array_values($wishlist));
        
        return true;
    }
    
    /**
     * Save wishlist
     */
    private function save_wishlist($wishlist) {
        if (is_user_logged_in()) {
            // Save to user meta
            $user_id = get_current_user_id();
            update_user_meta($user_id, 'dev_ash_wishlist', $wishlist);
        } else {
            // Save to cookie
            $expiration = time() + (30 * DAY_IN_SECONDS); // 30 days
            setcookie('dev_ash_wishlist', json_encode($wishlist), $expiration, COOKIEPATH, COOKIE_DOMAIN);
        }
    }
    
    /**
     * Merge wishlists on user login
     */
    public function merge_wishlists_on_login($user_login, $user) {
        // Check if guest has a wishlist
        if (isset($_COOKIE['dev_ash_wishlist'])) {
            $guest_wishlist = json_decode(stripslashes($_COOKIE['dev_ash_wishlist']), true);
            
            if (!empty($guest_wishlist)) {
                // Get user wishlist
                $user_wishlist = get_user_meta($user->ID, 'dev_ash_wishlist', true);
                
                if (!$user_wishlist) {
                    $user_wishlist = array();
                }
                
                // Merge wishlists (remove duplicates)
                $merged_wishlist = array_unique(array_merge($user_wishlist, $guest_wishlist));
                
                // Save merged wishlist
                update_user_meta($user->ID, 'dev_ash_wishlist', $merged_wishlist);
                
                // Clear guest wishlist cookie
                setcookie('dev_ash_wishlist', '', time() - 3600, COOKIEPATH, COOKIE_DOMAIN);
            }
        }
    }
}

// Initialize
function dev_ash_wishlist_init() {
    // Check if WooCommerce is active
    if (in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
        Dev_Ash_Wishlist::get_instance();
    }
}
add_action('plugins_loaded', 'dev_ash_wishlist_init');

// Register activation hook - doesn't work in a theme, you need to call this function manually once
// or create a small plugin with this functionality
function dev_ash_wishlist_activate() {
    // Check if WooCommerce is active
    if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
        // Deactivate the plugin
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(__('Please install and activate WooCommerce before activating this plugin.', 'dev-ash-wishlist'));
    }
    
    // Create wishlist page
    $wishlist = Dev_Ash_Wishlist::get_instance();
    $wishlist->create_wishlist_page();
}

// Since we're adding this to functions.php, we should call this once
if (!get_option('dev_ash_wishlist_page_id')) {
    add_action('after_switch_theme', 'dev_ash_wishlist_activate');
    // Also run immediately if this is being added to an already active theme
    if (did_action('after_switch_theme') || !doing_action('after_switch_theme')) {
        dev_ash_wishlist_activate();
    }
}