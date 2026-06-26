import webview
from bridge.api import GameAPI

def main():
    api = GameAPI()
    window = webview.create_window(
        title="Fanoron-telo 3D",
        url="web/index.html",
        js_api=api,
        width=1280,
        height=800,
        min_size=(800, 600),
        fullscreen=False
    )
    webview.start()

if __name__ == '__main__':
    main()