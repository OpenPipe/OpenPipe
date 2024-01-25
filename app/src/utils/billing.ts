export function calculateSpendingsWithCredits(spend: number, credits: number) {
  const totalSpent = calculateTotalSpent(spend, credits);
  const creditsUsed = calculateCreditsUsed(spend, credits);
  const remainingCredits = calculateRemainingCredits(spend, credits);

  return { totalSpent, creditsUsed, remainingCredits };

  function calculateTotalSpent(spend: number, credits: number) {
    const totalSpent = spend - credits;

    return totalSpent > 0 ? totalSpent : 0;
  }

  function calculateCreditsUsed(spend: number, credits: number) {
    return spend - credits < 0 ? spend : credits;
  }

  function calculateRemainingCredits(spend: number, credits: number) {
    const remainingCredits = credits - spend;

    return remainingCredits > 0 ? remainingCredits : 0;
  }
}
