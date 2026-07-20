import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      include: [
        'src/data/dynamicPrices.ts',
        'src/data/shifts.ts',
        'src/lib/economyMath.ts',
        'src/lib/heroVariant.ts',
        'src/lib/portalAuth.ts',
        'src/lib/portalSession.ts',
        'src/lib/portalShiftPerms.ts',
        'src/lib/portalShiftRoles.ts',
        'src/lib/attribution/cookie.ts',
        'src/utils/phoneMask.ts',
        'src/utils/plural.ts',
      ],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 80,
        branches: 80,
      },
    },
  },
});
