const puppeteer = require("puppeteer");

const url = "https://www.mozzartbet.co.ke/en#/";
const username = "0708313804";
const password = "mvH5zsax@";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Increase the navigation timeout to 60 seconds (60000 ms)
  page.setDefaultNavigationTimeout(60000000);

  await page.goto(url);

  // Navigate to the site
  // Return all the code in the page
  // const html = await page.content();

  // Helper function to wait for a specified duration
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Click "Cancel" on the notification popup
  try {
    await page.waitForSelector("#onesignal-slidedown-cancel-button", {
      timeout: 5000,
    });
    await page.click("#onesignal-slidedown-cancel-button");
    console.log("Cancelled the notification prompt.");
  } catch (error) {
    console.log("Notification prompt not found or already dismissed.");
  }

  // Click the Aviator game link before login
  // Wait for the broader container to appear
  try {
    // Ensure the parent container is loaded
    await page.waitForSelector("div.horizontal-holder.dark.vb", {
      timeout: 10000,
    });

    // Adding a delay to ensure the element fully loads
    await sleep(2000);

    // Try finding and clicking the Aviator link with a more generalized selector
    await page.waitForSelector("a.aviator", { timeout: 5000 });
    await page.click("a.aviator");
    console.log("Clicked Aviator game link before login.");
  } catch (error) {
    console.log("Aviator game link not found.");
  }

  // Wait for the username and password fields to appear in the login form
  await page.waitForSelector(
    'form.login-form-new input[type="text"][placeholder="Mobile number"]'
  );
  await page.waitForSelector(
    'form.login-form-new input[type="password"][placeholder="Password"]'
  );

  await sleep(2100);

  // Type username and password
  await page.type(
    'form.login-form-new input[type="text"][placeholder="Mobile number"]',
    username
  );

  await sleep(3100);

  await page.type(
    'form.login-form-new input[type="password"][placeholder="Password"]',
    password
  );

  // Click the login button and wait for navigation

  page.click("form.login-form-new button.login-button"),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    console.log("Clicked the login button.");

  // Wait for 5 seconds before interacting again
  await sleep(5000);

  // Click the Aviator link again after login
  try {
    // Wait for the container that includes the Aviator link
    await page.waitForSelector("a.aviator", { timeout: 10000 });

    // Click on the Aviator link
    await page.click("a.aviator");
    console.log("Clicked Aviator game link after login.");
  } catch (error) {
    console.log("Aviator game link not found after login.");
  }
  async function waitForSelectorInFrames(page, selector, timeout = 30000) {
    const startTime = new Date().getTime();
    let currentFrame = null;
    let frameFound = false;

    while (new Date().getTime() - startTime < timeout) {
      for (const frame of page.frames()) {
        try {
          await frame.waitForSelector(selector, { timeout: 1000 });
          currentFrame = frame;
          frameFound = true;
          break;
        } catch (error) {
          // Ignore the error and continue searching
        }
      }

      if (frameFound) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!frameFound) {
      throw new Error(`Selector "${selector}" not found in any frame.`);
    }

    return currentFrame;
  }

  /*
      try {
          const betButtonFrame = await waitForSelectorInFrames(page, 'div.buttons-block > button.btn.btn-success.bet.ng-star-inserted', 60000);
      
          await betButtonFrame.evaluate(() => {
            const betButton = document.querySelector('div.buttons-block > button.btn.btn-success.bet.ng-star-inserted');
            if (betButton) {
              betButton.click();
            }
          });
      
          console.log('Clicked the bet button.');
        } catch (error) {
          console.error('Error while trying to click the bet button:', error.message);
        }
  */

  let previousAppBubbleValue = null;
  let shouldBet = false;

  const logLatestAppBubbleValue = async () => {
    try {
      const frame = await waitForSelectorInFrames(
        page,
        ".payouts-wrapper .bubble-multiplier"
      );

      const appBubbleValue = await frame.evaluate(() => {
        const bubbleMultipliers = document.querySelectorAll(
          ".payouts-wrapper .bubble-multiplier"
        );
        const latestBubbleMultiplier = bubbleMultipliers[0];
        const value = latestBubbleMultiplier
          ? latestBubbleMultiplier.textContent.trim()
          : null;
        return value ? parseFloat(value.slice(0, -1)) : null;
      });

      console.log("Latest data win:", appBubbleValue);

      if (
        appBubbleValue > 1.1 &&
        (previousAppBubbleValue === null ||
          appBubbleValue !== previousAppBubbleValue)
      ) {
        shouldBet = true;
      } else {
        shouldBet = false;
      }

      if (shouldBet) {
        console.log("sudoMode::>>isBetting.");

        const betButtonFrame = await waitForSelectorInFrames(
          page,
          "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted",
          60000
        );

        await betButtonFrame.evaluate(() => {
          const betButton = document.querySelector(
            "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted"
          );
          if (betButton) {
            const buttonText = betButton.textContent.trim().toLowerCase();
            console.log("Button text:", buttonText);

            if (buttonText !== "cancel") {
              betButton.click();
              console.log("isBetting > Clicked!");
            } else {
              console.log("Bet In");
            }
          }
        });

        // New addition: Wait 4 seconds and then cash out
        setTimeout(async () => {
          try {
            const cashoutButtonFrame = await waitForSelectorInFrames(
              page,
              "div.buttons-block > button.btn.btn-warning.cashout.ng-star-inserted"
            );

            await cashoutButtonFrame.evaluate(() => {
              const cashoutButton = document.querySelector(
                "div.buttons-block > button.btn.btn-warning.cashout.ng-star-inserted"
              );
              if (cashoutButton) {
                cashoutButton.click();
                console.log("Cashout > Clicked!");
              }
            });
          } catch (cashoutError) {
            console.error("Error during cashout:", cashoutError.message);
          }
        }, 4000); // Wait 4 seconds before cashing out
      } else {
        console.log("Latest > 1.23, isWaiting.");
      }

      previousAppBubbleValue = appBubbleValue;

      await page.mainFrame();
    } catch (error) {
      console.error(
        "Error while trying to log latest app bubble value:",
        error.message
      );
    }
  };

  setInterval(logLatestAppBubbleValue, 4000);

  // Wait for 24 hours (86400000 ms)
  await new Promise((resolve) => setTimeout(resolve, 86400000));

  // Add a termination notification
  console.log("Process terminated successfully after 24 hours.");

  // Close the browser
  await browser.close();
})();
