![The logo of BBN One](.github/logo.png?version%253D1698775826612)

# bbn.music

The BBN Website.

## External Contributions

We welcome external contributions! Please feel free to open a pull request.

## Setup

1. **Install [Bun](https://bun.com)**
   - Follow the instructions on the Bun website to install Bun for your platform.

2. **Install dependencies:**

   ```sh
   bun install
   ```

3. **Start the development server:**

   ```sh
   bun run dev
   ```

4. **Set API overrides to use the production server:**
   Open your browser console and run:

   ```js
   localStorage.setItem('OVERRIDE_BASE_URL', 'https://bbn.music/');
   localStorage.setItem('OVERRIDE_WS_URL', 'wss://bbn.music/ws');
   ```

---

If you have any questions or issues, please open an issue or reach out via PR!
