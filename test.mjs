import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--ignore-certificate-errors', '--disable-web-security']
    });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR STR:', error.message);
        console.log('PAGE ERROR STACK:', error.stack);
    });

    try {
        console.log("Navigating...");
        await page.goto('https://localhost:8000', { waitUntil: 'networkidle2', timeout: 10000 });

        // Wait for the login form
        await page.waitForSelector('input[placeholder="Enter your full name"]', { timeout: 5000 });
        console.log('Typing name...');
        await page.type('input[placeholder="Enter your full name"]', 'John Doe');
        await page.type('input[placeholder="e.g. 21CS101"]', '12345');

        console.log('Pressing Enter...');
        await page.keyboard.press('Enter');

        // wait a bit for react features to mount
        await new Promise(r => setTimeout(r, 6000));
    } catch (err) {
        console.log("Nav error:", err);
    } finally {
        await browser.close();
    }
})();
