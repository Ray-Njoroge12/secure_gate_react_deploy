const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ASSETS_DIR = path.join(__dirname, '..', 'demo-assets');

const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function dismissOverlays(page) {
    try {
        await page.evaluate(() => {
            const cookieBtn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent.includes('Accept All') || b.textContent.includes('Accept')
            );
            if (cookieBtn) cookieBtn.click();

            const skipBtn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent.includes('Skip tour') || b.textContent.includes('Skip')
            );
            if (skipBtn) skipBtn.click();
        });
        await wait(500);
    } catch (e) { }
}

async function typeIntoInput(page, selector, text) {
    await page.waitForSelector(selector, { timeout: 10000 });
    const input = await page.$(selector);
    await input.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await input.type(text, { delay: 30 });
    await page.keyboard.press('Tab');
}

async function typeByLabel(page, labelText, text) {
    await page.waitForFunction((l) => {
        const labels = Array.from(document.querySelectorAll('label'));
        return labels.some(lb => lb.textContent.includes(l));
    }, { timeout: 10000 }, labelText);

    const handles = await page.evaluateHandle((l) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(lb => lb.textContent.includes(l));
        if (!label) return null;
        if (label.htmlFor) return document.getElementById(label.htmlFor);

        let current = label.nextElementSibling;
        while (current) {
            if (current.tagName === 'INPUT') return current;
            const nested = current.querySelector('input');
            if (nested) return nested;
            current = current.nextElementSibling;
        }
        // Check children
        const childInput = label.querySelector('input');
        if (childInput) return childInput;

        // Try parent's next sibling (some UI kits wrap label and input separately)
        let parent = label.parentElement;
        if (parent) {
            const siblingInput = parent.querySelector('input');
            if (siblingInput) return siblingInput;
        }

        return null;
    }, labelText);

    const el = handles.asElement();
    if (el) {
        await el.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await el.type(text, { delay: 30 });
        await page.keyboard.press('Tab');
    } else {
        throw new Error(`Could not find input for label: ${labelText}`);
    }
}

async function forceLogout(page) {
    console.log('--- Force Logout ---');
    await page.evaluate(async () => {
        try { fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { }
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
}

async function takeScreenshot(page, name) {
    await dismissOverlays(page);
    const filePath = path.join(ASSETS_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Captured: ${name}.png`);
}

async function runDemo() {
    if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR);

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const demoData = {};

    try {
        // === PHASE 1: LOGIN AS ADMIN ===
        console.log('--- Phase 1: Admin Login ---');
        await page.goto(`${BASE_URL}/login`);
        await typeIntoInput(page, 'input#email', 'admin@securegate.com');
        await typeIntoInput(page, 'input#password', 'AdminPass123!');
        await takeScreenshot(page, '01-admin-login-filled');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await takeScreenshot(page, '02-admin-dashboard');

        // === PHASE 2: ADMIN CREATES GUARD ===
        console.log('--- Phase 2: Create Guard ---');
        await page.goto(`${BASE_URL}/dashboard/admin/guards`);
        await wait(3000);
        await dismissOverlays(page);

        const addGuardBtn = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Guard'));
        });

        if (addGuardBtn && addGuardBtn.asElement()) {
            await addGuardBtn.asElement().click();
            await wait(1500);

            await typeByLabel(page, 'Username', `guard_demo_${Math.floor(Math.random() * 1000)}`);
            await typeByLabel(page, 'Email', `demo_guard_${Date.now()}@example.com`);
            await typeByLabel(page, 'First Name', 'Demo');
            await typeByLabel(page, 'Last Name', 'Guard');
            await typeByLabel(page, 'Phone', '+254700000001');
            await typeByLabel(page, 'Password', 'GuardPass123!');

            await takeScreenshot(page, '03-admin-create-guard-form');

            const submitBtn = await page.evaluateHandle(() => {
                return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Guard'));
            });
            if (submitBtn && submitBtn.asElement()) await submitBtn.asElement().click();

            await wait(3000);
            await takeScreenshot(page, '04-admin-guard-created');
        }

        await forceLogout(page);

        // === PHASE 3: LOGIN AS RESIDENT ===
        console.log('--- Phase 3: Resident Login ---');
        await typeIntoInput(page, 'input#email', 'resident1@securegate.com');
        await typeIntoInput(page, 'input#password', 'ResidentPass123!');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await takeScreenshot(page, '05-resident-dashboard');

        // === PHASE 4: RESIDENT CREATES QUICK INVITE ===
        console.log('--- Phase 4: Create Quick Invite ---');
        await page.goto(`${BASE_URL}/resident/quick-invite`); // Fixed path
        await wait(2000);
        await dismissOverlays(page);
        await typeIntoInput(page, 'input#guest-name', 'Supademo Guest');
        await typeIntoInput(page, 'input#guest-phone', '0712345678');

        const tomorrowBtn = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tomorrow'));
        });
        if (tomorrowBtn && tomorrowBtn.asElement()) await tomorrowBtn.asElement().click();

        await takeScreenshot(page, '06-resident-quick-invite-filled');
        await page.click('button[type="submit"]');

        await wait(4000);
        await takeScreenshot(page, '07-resident-invite-success');

        const inviteCode = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const codeEl = spans.find(s => s.className.includes('tracking-wider') && s.innerText.length >= 6);
            return codeEl ? codeEl.innerText.trim() : null;
        });

        console.log('Invite Code Extracted:', inviteCode);
        demoData.inviteCode = inviteCode;

        if (inviteCode) {
            // === PHASE 5: VISITOR REGISTRATION ===
            console.log('--- Phase 5: Visitor Registration ---');
            await page.goto(`${BASE_URL}/invite/${inviteCode}`);
            await wait(3000);
            await dismissOverlays(page);
            await takeScreenshot(page, '08-visitor-landing');

            await typeByLabel(page, 'Full Name', 'Supademo Visitor');
            await typeByLabel(page, 'Phone Number', '+254712345678');
            await typeByLabel(page, 'ID / Passport', 'ID-SUPA-123');
            await typeByLabel(page, 'Vehicle Registration', 'KCD 999S');

            const checkbox = await page.$('input[type="checkbox"]');
            if (checkbox) await checkbox.click();

            await takeScreenshot(page, '09-visitor-form-filled');

            const confirmBtn = await page.evaluateHandle(() => {
                return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Complete Invitation'));
            });
            if (confirmBtn && confirmBtn.asElement()) await confirmBtn.asElement().click();

            await wait(6000);
            await takeScreenshot(page, '10-visitor-pass-qr');

            const passCode = await page.evaluate(() => {
                const spans = Array.from(document.querySelectorAll('span'));
                const label = spans.find(s => s.textContent.includes('Pass Code'));
                if (label && label.nextElementSibling) return label.nextElementSibling.innerText.trim();
                // Fallback for different rendering
                const codeEl = document.querySelector('.otp-display, .pass-code-display');
                return codeEl ? codeEl.innerText.trim() : null;
            });
            console.log('Pass Code Extracted:', passCode);
            demoData.passCode = passCode;

            if (passCode) {
                // === PHASE 6: GUARD CHECK-IN ===
                console.log('--- Phase 6: Guard Check-in ---');
                await forceLogout(page);

                await typeIntoInput(page, 'input#email', 'guard1@securegate.com');
                await typeIntoInput(page, 'input#password', 'GuardPass123!');
                await page.click('button[type="submit"]');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await takeScreenshot(page, '11-guard-dashboard');

                await page.goto(`${BASE_URL}/dashboard/guard/manual-check`, { waitUntil: 'networkidle0' });
                await wait(2000);
                await typeIntoInput(page, 'input[placeholder*="Search"]', passCode);
                await page.keyboard.press('Enter');

                await wait(3000);
                await takeScreenshot(page, '12-guard-search-result');

                const checkInBtn = await page.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Check In'));
                });
                if (checkInBtn && checkInBtn.asElement()) await checkInBtn.asElement().click();

                await wait(2000);
                await takeScreenshot(page, '13-guard-check-in-success');
            }
        }

        console.log('Demo simulation complete!');
        fs.writeFileSync(path.join(ASSETS_DIR, 'demo-data.json'), JSON.stringify(demoData, null, 2));

    } catch (error) {
        console.error('Demo failed:', error);
        await takeScreenshot(page, 'error-state');
    } finally {
        await browser.close();
    }
}

runDemo();
