import UIKit
import Capacitor

class CustomViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Disable automatic content inset adjustment for the webview
        // This prevents iOS from adding safe area padding that duplicates CSS padding
        if let webView = self.webView {
            webView.scrollView.contentInsetAdjustmentBehavior = .never
        }
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // Ensure webview fills the entire view without safe area insets
        if let webView = self.webView {
            webView.frame = self.view.bounds
            webView.scrollView.contentInset = .zero
            webView.scrollView.scrollIndicatorInsets = .zero
        }
    }
    
    // Remove additional safe area insets
    override var additionalSafeAreaInsets: UIEdgeInsets {
        get { return .zero }
        set { }
    }
}
