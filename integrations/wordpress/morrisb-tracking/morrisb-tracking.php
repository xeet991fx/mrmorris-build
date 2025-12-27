<?php
/**
 * Plugin Name: MorrisB Tracking
 * Plugin URI: https://morrisb.com/wordpress-plugin
 * Description: Automatically track website visitors and convert them into leads in MorrisB CRM
 * Version: 1.0.0
 * Author: MorrisB
 * Author URI: https://morrisb.com
 * License: GPL2
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class MorrisB_Tracking {

    private $option_name = 'morrisb_workspace_id';

    public function __construct() {
        // Add settings menu
        add_action('admin_menu', array($this, 'add_settings_page'));

        // Register settings
        add_action('admin_init', array($this, 'register_settings'));

        // Add tracking script to frontend
        add_action('wp_head', array($this, 'add_tracking_script'), 1);
    }

    /**
     * Add settings page to WordPress admin
     */
    public function add_settings_page() {
        add_options_page(
            'MorrisB Tracking Settings',
            'MorrisB Tracking',
            'manage_options',
            'morrisb-tracking',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('morrisb_tracking_settings', $this->option_name);
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        $workspace_id = get_option($this->option_name, '');
        ?>
        <div class="wrap">
            <h1>MorrisB Tracking Settings</h1>
            <p>Connect your WordPress site to MorrisB CRM to track visitors and generate leads automatically.</p>

            <form method="post" action="options.php">
                <?php settings_fields('morrisb_tracking_settings'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="<?php echo $this->option_name; ?>">
                                Workspace ID
                            </label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="<?php echo $this->option_name; ?>"
                                name="<?php echo $this->option_name; ?>"
                                value="<?php echo esc_attr($workspace_id); ?>"
                                class="regular-text"
                                placeholder="e.g., 507f1f77bcf86cd799439011"
                            />
                            <p class="description">
                                Find your Workspace ID in MorrisB: Settings → Tracking
                            </p>
                        </td>
                    </tr>
                </table>

                <?php if (!empty($workspace_id)): ?>
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 12px; border-radius: 4px; margin: 20px 0;">
                        <strong>✅ Tracking Active!</strong><br>
                        Your website is now tracking visitors and sending data to MorrisB CRM.
                    </div>
                <?php else: ?>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin: 20px 0;">
                        <strong>⚠️ Not Connected</strong><br>
                        Enter your Workspace ID to start tracking visitors.
                    </div>
                <?php endif; ?>

                <?php submit_button(); ?>
            </form>

            <hr>

            <h2>What Gets Tracked?</h2>
            <ul style="list-style: disc; margin-left: 20px;">
                <li>Page views on every page</li>
                <li>Visitor sessions (30-minute timeout)</li>
                <li>UTM campaign parameters</li>
                <li>Traffic sources and referrers</li>
                <li>Device information</li>
                <li>Form submissions (automatic contact creation)</li>
            </ul>

            <h2>How to Configure</h2>
            <ol style="margin-left: 20px;">
                <li>Log in to your MorrisB account</li>
                <li>Go to Settings → Tracking</li>
                <li>Copy your Workspace ID</li>
                <li>Paste it in the field above and save</li>
            </ol>

            <p><strong>Advanced Configuration:</strong></p>
            <p>To use a custom tracking URL (self-hosted), add this to your <code>wp-config.php</code>:</p>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">define('MORRISB_TRACKING_URL', 'https://your-domain.com/track.js');</pre>
        </div>
        <?php
    }

    /**
     * Add tracking script to site header
     */
    public function add_tracking_script() {
        $workspace_id = get_option($this->option_name);

        // Only add script if workspace ID is set
        if (empty($workspace_id)) {
            return;
        }

        // Get tracking script URL (configurable via wp-config.php)
        $tracking_url = defined('MORRISB_TRACKING_URL')
            ? MORRISB_TRACKING_URL
            : 'https://app.morrisb.com/track.js';

        // Output tracking script
        ?>
        <!-- MorrisB Tracking -->
        <script src="<?php echo esc_url($tracking_url); ?>" async></script>
        <script>
            (function() {
                function initMorrisB() {
                    if (window.morrisb) {
                        window.morrisb('<?php echo esc_js($workspace_id); ?>');
                    } else {
                        setTimeout(initMorrisB, 100);
                    }
                }
                initMorrisB();
            })();
        </script>
        <?php
    }
}

// Initialize plugin
new MorrisB_Tracking();
