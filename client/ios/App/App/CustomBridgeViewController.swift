import UIKit
import Capacitor
import WebKit

/// Subclass of CAPBridgeViewController that enables Safari Web Inspector for the embedded WKWebView.
/// Without this, Safari → Develop → [Simulator] shows "No Inspectable Applications".
final class CustomBridgeViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        setWebViewInspectable()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setWebViewInspectable()
    }

    private func setWebViewInspectable() {
        let target: WKWebView? = (webView as? WKWebView) ?? findWebView(in: view)
        guard let webView = target else { return }
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        } else {
            if webView.responds(to: Selector(("setInspectable:"))) {
                webView.perform(Selector(("setInspectable:")), with: true)
            }
        }
    }

    private func findWebView(in view: UIView?) -> WKWebView? {
        guard let view = view else { return nil }
        if let wv = view as? WKWebView { return wv }
        for subview in view.subviews {
            if let found = findWebView(in: subview) { return found }
        }
        return nil
    }
}
