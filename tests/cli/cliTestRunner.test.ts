import { describe, it, expect, beforeAll } from 'vitest';
import {
  runCliTest,
  runCliTests,
  runCliTestsParallel,
  generateReport,
  getReportSummary,
  assertTestResult,
  saveResults,
  loadResults,
  type TestResult,
  type CliTestOptions
} from './cliTestRunner';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

describe('CLI Test Runner', () => {
  describe('runCliTest', () => {
    it('should execute a simple command successfully', async () => {
      const result = await runCliTest('echo', ['hello world']);

      expect(result.command).toBe('echo');
      expect(result.args).toEqual(['hello world']);
      expect(result.passed).toBe(true);
      expect(result.stdout).toBe('hello world');
      expect(result.exitCode).toBe(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should capture stderr output', async () => {
      const result = await runCliTest('node', [
        '-e',
        'console.error("error message")'
      ]);

      expect(result.stderr).toContain('error message');
      expect(result.passed).toBe(true); // stderr doesn't mean failure
      expect(result.exitCode).toBe(0);
    });

    it('should handle command failures with non-zero exit codes', async () => {
      const result = await runCliTest('node', [
        '-e',
        'process.exit(1)'
      ]);

      expect(result.passed).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should handle expected non-zero exit codes', async () => {
      const result = await runCliTest(
        'node',
        ['-e', 'process.exit(42)'],
        { expectedExitCode: 42 }
      );

      expect(result.passed).toBe(true);
      expect(result.exitCode).toBe(42);
    });

    it('should timeout long-running commands', async () => {
      const result = await runCliTest(
        'node',
        ['-e', 'setTimeout(() => {}, 10000)'],
        { timeout: 500 }
      );

      expect(result.passed).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.duration).toBeLessThan(2000);
    }, 10000);

    it('should handle invalid commands', async () => {
      const result = await runCliTest('this-command-does-not-exist-12345', []);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      // Exit code can be -1 or -2 depending on the system
      expect(result.exitCode).toBeLessThan(0);
    });

    it('should pass stdin to command', async () => {
      const result = await runCliTest(
        'node',
        ['-e', 'process.stdin.on("data", d => console.log(d.toString().trim()))'],
        { stdin: 'test input\n', timeout: 2000 }
      );

      expect(result.stdout).toContain('test input');
    });

    it('should use custom working directory', async () => {
      const result = await runCliTest(
        'pwd',
        [],
        { cwd: '/tmp' }
      );

      expect(result.stdout).toContain('/tmp');
    });

    it('should use custom environment variables', async () => {
      const result = await runCliTest(
        'node',
        ['-e', 'console.log(process.env.CUSTOM_VAR)'],
        { env: { ...process.env, CUSTOM_VAR: 'custom_value' } }
      );

      expect(result.stdout).toContain('custom_value');
    });
  });

  describe('runCliTests', () => {
    it('should run multiple tests sequentially', async () => {
      const tests = [
        { name: 'test1', command: 'echo', args: ['test1'] },
        { name: 'test2', command: 'echo', args: ['test2'] },
        { name: 'test3', command: 'echo', args: ['test3'] }
      ];

      const results = await runCliTests(tests);

      expect(results).toHaveLength(3);
      expect(results[0].stdout).toBe('test1');
      expect(results[1].stdout).toBe('test2');
      expect(results[2].stdout).toBe('test3');
      expect(results.every(r => r.passed)).toBe(true);
    });

    it('should continue running tests after a failure', async () => {
      const tests = [
        { name: 'pass', command: 'echo', args: ['pass'] },
        { name: 'fail', command: 'node', args: ['-e', 'process.exit(1)'] },
        { name: 'pass2', command: 'echo', args: ['pass2'] }
      ];

      const results = await runCliTests(tests);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
      expect(results[2].passed).toBe(true);
    });
  });

  describe('runCliTestsParallel', () => {
    it('should run multiple tests in parallel', async () => {
      const tests = [
        { name: 'test1', command: 'echo', args: ['parallel1'] },
        { name: 'test2', command: 'echo', args: ['parallel2'] },
        { name: 'test3', command: 'echo', args: ['parallel3'] }
      ];

      const startTime = Date.now();
      const results = await runCliTestsParallel(tests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.passed)).toBe(true);

      // Parallel execution should be faster than sum of individual durations
      const sequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
      expect(totalTime).toBeLessThan(sequentialTime * 2);
    });
  });

  describe('generateReport', () => {
    it('should generate a formatted report', () => {
      const results: TestResult[] = [
        {
          command: 'echo',
          args: ['test'],
          passed: true,
          stdout: 'test',
          stderr: '',
          exitCode: 0,
          duration: 100
        },
        {
          command: 'node',
          args: ['-e', 'process.exit(1)'],
          passed: false,
          stdout: '',
          stderr: '',
          exitCode: 1,
          duration: 50,
          error: 'Non-zero exit code'
        }
      ];

      const report = generateReport(results);

      expect(report).toContain('CLI TEST REPORT');
      expect(report).toContain('PASS');
      expect(report).toContain('FAIL');
      expect(report).toContain('SUMMARY');
      expect(report).toContain('Total Tests:    2');
      expect(report).toContain('Passed:         1');
      expect(report).toContain('Failed:         1');
      expect(report).toContain('50.0%');
    });

    it('should include detailed output in verbose mode', () => {
      const results: TestResult[] = [
        {
          command: 'echo',
          args: ['verbose test'],
          passed: true,
          stdout: 'verbose output',
          stderr: '',
          exitCode: 0,
          duration: 100
        }
      ];

      const report = generateReport(results, true);

      expect(report).toContain('STDOUT:');
      expect(report).toContain('verbose output');
    });

    it('should show failed test details even without verbose', () => {
      const results: TestResult[] = [
        {
          command: 'test',
          args: [],
          passed: false,
          stdout: 'failed output',
          stderr: 'error details',
          exitCode: 1,
          duration: 100
        }
      ];

      const report = generateReport(results, false);

      expect(report).toContain('failed output');
      expect(report).toContain('error details');
    });
  });

  describe('getReportSummary', () => {
    it('should calculate summary statistics correctly', () => {
      const results: TestResult[] = [
        { command: 'a', args: [], passed: true, stdout: '', stderr: '', exitCode: 0, duration: 100 },
        { command: 'b', args: [], passed: true, stdout: '', stderr: '', exitCode: 0, duration: 200 },
        { command: 'c', args: [], passed: false, stdout: '', stderr: '', exitCode: 1, duration: 50 }
      ];

      const summary = getReportSummary(results);

      expect(summary.total).toBe(3);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.duration).toBe(350);
      expect(summary.passRate).toBeCloseTo(66.67, 1);
    });

    it('should handle empty results', () => {
      const summary = getReportSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.duration).toBe(0);
      expect(summary.passRate).toBe(0);
    });
  });

  describe('assertTestResult', () => {
    const mockResult: TestResult = {
      command: 'test',
      args: ['arg'],
      passed: true,
      stdout: 'hello world',
      stderr: '',
      exitCode: 0,
      duration: 100
    };

    it('should pass for matching expectations', () => {
      expect(() => {
        assertTestResult(mockResult, {
          passed: true,
          exitCode: 0,
          stdoutContains: 'hello'
        });
      }).not.toThrow();
    });

    it('should throw for mismatched passed status', () => {
      expect(() => {
        assertTestResult(mockResult, { passed: false });
      }).toThrow('Expected passed=false');
    });

    it('should throw for mismatched exit code', () => {
      expect(() => {
        assertTestResult(mockResult, { exitCode: 1 });
      }).toThrow('Expected exitCode=1');
    });

    it('should validate stdout contains string', () => {
      expect(() => {
        assertTestResult(mockResult, { stdoutContains: 'world' });
      }).not.toThrow();

      expect(() => {
        assertTestResult(mockResult, { stdoutContains: 'missing' });
      }).toThrow('Expected stdout to contain');
    });

    it('should validate stdout contains regex', () => {
      expect(() => {
        assertTestResult(mockResult, { stdoutContains: /^hello/ });
      }).not.toThrow();

      expect(() => {
        assertTestResult(mockResult, { stdoutContains: /^goodbye/ });
      }).toThrow('Expected stdout to contain');
    });

    it('should validate stdout not contains', () => {
      expect(() => {
        assertTestResult(mockResult, { stdoutNotContains: 'missing' });
      }).not.toThrow();

      expect(() => {
        assertTestResult(mockResult, { stdoutNotContains: 'hello' });
      }).toThrow('Expected stdout NOT to contain');
    });

    it('should validate max duration', () => {
      expect(() => {
        assertTestResult(mockResult, { maxDuration: 200 });
      }).not.toThrow();

      expect(() => {
        assertTestResult(mockResult, { maxDuration: 50 });
      }).toThrow('Expected duration <=');
    });
  });

  describe('saveResults and loadResults', () => {
    const testFile = join('/tmp', 'test-results.json');

    it('should save and load test results', async () => {
      const results: TestResult[] = [
        {
          command: 'echo',
          args: ['test'],
          passed: true,
          stdout: 'test output',
          stderr: '',
          exitCode: 0,
          duration: 123
        }
      ];

      await saveResults(results, testFile);
      expect(existsSync(testFile)).toBe(true);

      const loaded = await loadResults(testFile);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].command).toBe('echo');
      expect(loaded[0].stdout).toBe('test output');
      expect(loaded[0].duration).toBe(123);

      // Cleanup
      await unlink(testFile);
    });

    it('should include summary in saved results', async () => {
      const results: TestResult[] = [
        { command: 'a', args: [], passed: true, stdout: '', stderr: '', exitCode: 0, duration: 100 },
        { command: 'b', args: [], passed: false, stdout: '', stderr: '', exitCode: 1, duration: 50 }
      ];

      await saveResults(results, testFile);

      const fs = await import('fs/promises');
      const content = await fs.readFile(testFile, 'utf-8');
      const data = JSON.parse(content);

      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBe(2);
      expect(data.summary.passed).toBe(1);
      expect(data.summary.failed).toBe(1);
      expect(data.timestamp).toBeDefined();

      // Cleanup
      await unlink(testFile);
    });
  });
});
