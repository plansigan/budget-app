import { expect, test, type Page } from '@playwright/test';

async function loadDemoData(page: Page) {
  await page.goto('/');
  await page.getByText(/Skip Setup/).click();
  await page.getByLabel('Skip quick guide').click();

  await page.getByLabel('Budget setup tab').click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByText('Load Sample Demo Data').click();
  await page.getByText('Load Demo', { exact: true }).click();

  await page.getByLabel('Today tab').click();
  await expect(page.getByText("TODAY'S ACTIVITY")).toBeVisible();
}

test.describe('Velvet Budget E2E smoke suite', () => {
  test('loads cleanly with demo data, supports privacy masking, stacked Escape, transfer guard, edit source, and Buy Later persistence', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 1. Load Demo Data from fresh session
    await loadDemoData(page);
    await expect(page.getByText('Coffee', { exact: true })).toBeVisible();
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible();

    // 2. Privacy Mode toggle masks amounts and avoids leaks
    await page.getByLabel('Hide amounts').click();
    await expect(page.getByText('₱••••').first()).toBeVisible();
    await expect(page.getByText('₱3,500.00')).toHaveCount(0);
    await page.getByLabel('Show amounts').click();
    await expect(page.getByText('₱3,500.00').first()).toBeVisible();

    // 3. Stacked Escape closes only Undo confirmation while keeping Activity History open
    await page.getByLabel(/View all \d+ logged entries/).click();
    const historyDialog = page.getByRole('dialog');
    await expect(historyDialog.getByText('Activity History')).toBeVisible();
    await historyDialog.getByLabel('Undo Coffee').click();
    await expect(page.getByText('Delete & Undo Entry?')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Delete & Undo Entry?')).toHaveCount(0);
    await expect(page.getByText('Activity History')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Activity History')).toHaveCount(0);

    // 4. Edit Transaction allows switching payment source (Cash -> BPI)
    await page.getByText('Coffee', { exact: true }).first().click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('Edit Transaction')).toBeVisible();
    await editDialog.getByText('BPI', { exact: true }).click();
    await editDialog.getByLabel('Transaction note or label').fill('Iced Coffee');
    await editDialog.getByText('Save Changes').click();
    await expect(page.getByText('Iced Coffee', { exact: true })).toBeVisible();

    // Verify BPI balance updated in Wallet (12,000 - 145 = 11,855.00)
    await page.getByLabel('Wallet tab').click();
    await expect(page.getByText('₱11,855.00')).toBeVisible();

    // 5. Transfer modal inline overdraft guard
    await page.getByText('Transfer', { exact: true }).click();
    await expect(page.getByText('Transfer Money')).toBeVisible();
    await page.getByLabel('Transfer amount').fill('999999');
    await expect(page.getByText(/Insufficient balance in/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Transfer Money')).toHaveCount(0);

    // 6. Things I Want to Buy: decide ready demo item via Savings & add new item persisting across reload
    await page.getByLabel('Today tab').click();
    await page.getByLabel('Review Mechanical Keyboard').click();
    await expect(page.getByText('Decide on Your Purchase')).toBeVisible();
    await page.getByText('Take from Savings').click();
    await page.getByText('Buy & Add to Dashboard').click();
    await expect(
      page.getByText('Mechanical Keyboard (From Savings Jar)')
    ).toBeVisible();

    await page.getByRole('tab', { name: /Goals tab/ }).click();
    await page.getByRole('tab', { name: /Buy Later/ }).click();
    await page.getByLabel('Add item to Buy Later list').click();
    await expect(page.getByText('Add Thing to Buy')).toBeVisible();
    await page.getByLabel('Item name').fill('Desk Lamp');
    await page.getByLabel('Estimated price').fill('1200');
    await page.getByText('Start 7-Day Pause').click();

    await expect(page.getByText('Desk Lamp', { exact: true })).toBeVisible();
    await expect(page.getByText('7d left', { exact: true })).toBeVisible();

    // Persist check across browser reload
    await page.reload();
    await page.getByRole('tab', { name: /Goals tab/ }).click();
    await page.getByRole('tab', { name: /Buy Later/ }).click();
    await expect(page.getByText('Desk Lamp', { exact: true })).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
