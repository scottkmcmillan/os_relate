# RKM System Verification Workflow - Implementation Plan

## Pseudocode & Implementation Strategy

This document provides the pseudocode and implementation plan for the verification workflow.

## High-Level Algorithm

```pseudocode
FUNCTION runVerification():
    runner = new VerificationRunner(verbose=false)
    runner.start()

    // Phase 1: Pre-flight Checks
    PRINT "PHASE 1: PRE-FLIGHT CHECKS"
    runner.runCheck("Node.js Version", checkNodeVersion)
    runner.runCheck("Dependencies Installed", checkDependenciesInstalled)
    runner.runCheck("Build Exists", checkBuildExists)
    runner.runCheck("System Capabilities", checkSystemCapabilities)

    // Phase 2: Test Environment Setup
    PRINT "PHASE 2: TEST ENVIRONMENT SETUP"
    runner.runCheck("Setup Test Environment", setupTestEnvironment)

    // Phase 3: Ingestion & Query Tests
    PRINT "PHASE 3: INGESTION & QUERY VERIFICATION"
    runner.runCheck("Document Ingestion", testIngestion)
    runner.runCheck("Vector Query", testQuery)
    runner.runCheck("Hybrid Search", testSearch)
    runner.runCheck("Graph Query", testGraph)

    // Phase 4: Advanced Features
    PRINT "PHASE 4: ADVANCED FEATURES"
    runner.runCheck("Full Status Report", testStatusFull)
    runner.runCheck("Semantic Router", testRouter)

    // Phase 5: Cleanup
    PRINT "PHASE 5: CLEANUP"
    runner.runCheck("Cleanup Test Files", cleanupTestEnvironment)

    // Print summary and exit
    runner.printSummary()
    EXIT WITH (runner.hasFailures() ? 1 : 0)
END FUNCTION
```

## Core Data Structures

### CheckResult
```pseudocode
STRUCTURE CheckResult:
    passed: Boolean           // True if check succeeded
    message: String           // Human-readable summary
    details: String (optional) // Additional context
    duration: Integer (optional) // Milliseconds elapsed
END STRUCTURE
```

### VerificationRunner
```pseudocode
CLASS VerificationRunner:
    PRIVATE results: Map<String, CheckResult>
    PRIVATE startTime: Integer
    PRIVATE verbose: Boolean

    CONSTRUCTOR(verbose: Boolean):
        this.results = new Map()
        this.verbose = verbose
    END CONSTRUCTOR

    METHOD start():
        this.startTime = getCurrentTime()
    END METHOD

    ASYNC METHOD runCheck(name: String, checkFunction: Function):
        PRINT formatCheckHeader(name)

        checkStartTime = getCurrentTime()
        TRY:
            result = AWAIT checkFunction()
            result.duration = getCurrentTime() - checkStartTime
            this.results.set(name, result)
            this.printResult(result)
        CATCH error:
            result = {
                passed: false,
                message: "Check threw an exception",
                details: error.message,
                duration: getCurrentTime() - checkStartTime
            }
            this.results.set(name, result)
            this.printResult(result)
        END TRY
    END METHOD

    METHOD printResult(result: CheckResult):
        icon = result.passed ? "✓" : "✗"
        color = result.passed ? GREEN : RED

        PRINT color + icon + " " + result.message + RESET_COLOR
        PRINT " (" + result.duration + "ms)"

        IF result.details AND (this.verbose OR NOT result.passed):
            PRINT "  Details: " + result.details
        END IF
    END METHOD

    METHOD printSummary():
        total = this.results.size
        passed = COUNT(this.results WHERE result.passed == true)
        failed = total - passed
        totalDuration = getCurrentTime() - this.startTime

        PRINT "\n=========================================="
        PRINT "VERIFICATION SUMMARY"
        PRINT "=========================================="
        PRINT "Total checks: " + total
        PRINT "Passed: " + passed
        IF failed > 0:
            PRINT "Failed: " + failed
        END IF
        PRINT "Pass rate: " + (passed / total * 100) + "%"
        PRINT "Total time: " + totalDuration + "ms"

        IF failed == 0:
            PRINT "🎉 All verification checks passed!"
        ELSE:
            PRINT "⚠️  Some checks failed."
            PRINT "\nFailed checks:"
            FOR EACH (name, result) IN this.results:
                IF NOT result.passed:
                    PRINT "  ✗ " + name + ": " + result.message
                    IF result.details:
                        PRINT "    " + result.details
                    END IF
                END IF
            END FOR
        END IF
    END METHOD

    METHOD hasFailures():
        RETURN EXISTS result IN this.results WHERE result.passed == false
    END METHOD
END CLASS
```

## Phase 1: Pre-flight Checks

### Check 1: Node.js Version
```pseudocode
ASYNC FUNCTION checkNodeVersion() -> CheckResult:
    TRY:
        nodeVersion = GET_NODE_VERSION()
        majorVersion = PARSE_INT(nodeVersion.split('.')[0].slice(1))

        IF majorVersion >= 18:
            RETURN {
                passed: true,
                message: "Node.js version is compatible: " + nodeVersion,
                details: "Minimum required: v18.x"
            }
        ELSE:
            RETURN {
                passed: false,
                message: "Node.js version too old: " + nodeVersion,
                details: "Required: v18.x or higher. Please upgrade."
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Could not determine Node.js version",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Check 2: Dependencies Installed
```pseudocode
ASYNC FUNCTION checkDependenciesInstalled() -> CheckResult:
    TRY:
        nodeModulesExists = FILE_EXISTS("node_modules/")

        IF NOT nodeModulesExists:
            RETURN {
                passed: false,
                message: "Dependencies not installed",
                details: "Run: npm install"
            }
        END IF

        criticalPackages = [
            "ruvector",
            "commander",
            "better-sqlite3",
            "@modelcontextprotocol/sdk"
        ]

        missing = []
        FOR EACH package IN criticalPackages:
            packagePath = "node_modules/" + package
            IF NOT FILE_EXISTS(packagePath):
                missing.push(package)
            END IF
        END FOR

        IF missing.length > 0:
            RETURN {
                passed: false,
                message: "Some critical packages are missing",
                details: "Missing: " + missing.join(", ") + ". Run: npm install"
            }
        END IF

        RETURN {
            passed: true,
            message: "All critical dependencies installed",
            details: "Checked: " + criticalPackages.join(", ")
        }
    CATCH error:
        RETURN {
            passed: false,
            message: "Error checking dependencies",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Check 3: Build Exists
```pseudocode
ASYNC FUNCTION checkBuildExists() -> CheckResult:
    TRY:
        distDir = "dist/"
        cliPath = "dist/cli.js"

        IF NOT FILE_EXISTS(distDir):
            RETURN {
                passed: false,
                message: "Build directory does not exist",
                details: "Run: npm run build"
            }
        END IF

        IF NOT FILE_EXISTS(cliPath):
            RETURN {
                passed: false,
                message: "CLI build file not found",
                details: "Run: npm run build"
            }
        END IF

        fileCount = COUNT_FILES_MATCHING("dist/**/*.js")

        RETURN {
            passed: true,
            message: "Build exists and is ready",
            details: "Found " + fileCount + " JavaScript files in dist/"
        }
    CATCH error:
        RETURN {
            passed: false,
            message: "Error checking build",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Check 4: System Capabilities
```pseudocode
ASYNC FUNCTION checkSystemCapabilities() -> CheckResult:
    TRY:
        output = EXEC_COMMAND("node dist/cli.js status --json", timeout=10000)
        status = JSON_PARSE(output)

        IF NOT status.capabilities:
            RETURN {
                passed: false,
                message: "Could not retrieve system capabilities",
                details: "Status command did not return capabilities"
            }
        END IF

        caps = status.capabilities
        implementation = caps.implementation.type OR "unknown"
        modules = caps.modules OR {}

        details = [
            "Implementation: " + implementation,
            "GNN: " + (modules.gnnAvailable ? "Available" : "Not Available"),
            "Attention: " + (modules.attentionAvailable ? "Available" : "Not Available"),
            "SONA: " + (modules.sonaAvailable ? "Available" : "Not Available")
        ].join(", ")

        RETURN {
            passed: true,
            message: "System capabilities retrieved successfully",
            details: details
        }
    CATCH error:
        RETURN {
            passed: false,
            message: "Failed to retrieve system capabilities",
            details: error.message
        }
    END TRY
END FUNCTION
```

## Phase 2: Test Environment Setup

```pseudocode
ASYNC FUNCTION setupTestEnvironment() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        // Clean up existing test files
        IF FILE_EXISTS(testDbPath):
            DELETE_FILE(testDbPath)
        END IF

        IF DIRECTORY_EXISTS(testDataDir):
            DELETE_DIRECTORY_RECURSIVE(testDataDir)
        END IF

        // Create test directory
        CREATE_DIRECTORY(testDataDir)

        // Create sample documents
        sampleDocs = [
            {
                filename: "sample1.md",
                content: "# Machine Learning Fundamentals\n\nML is a subset of AI...",
                tags: ["ml", "ai"]
            },
            {
                filename: "sample2.md",
                content: "# Neural Networks\n\nNeural networks are inspired by brains...",
                tags: ["ml", "neural-networks"]
            },
            {
                filename: "sample3.md",
                content: "# Deep Learning Applications\n\nDeep learning has revolutionized CV, NLP...",
                tags: ["deep-learning", "ai"]
            }
        ]

        FOR EACH doc IN sampleDocs:
            filePath = testDataDir + "/" + doc.filename
            WRITE_FILE(filePath, doc.content)
        END FOR

        RETURN {
            passed: true,
            message: "Test environment setup complete",
            details: "Created " + sampleDocs.length + " sample documents in " + testDataDir
        }
    CATCH error:
        RETURN {
            passed: false,
            message: "Failed to setup test environment",
            details: error.message
        }
    END TRY
END FUNCTION
```

## Phase 3: Ingestion & Query Verification

### Test 1: Document Ingestion
```pseudocode
ASYNC FUNCTION testIngestion() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        command = "node dist/cli.js --db " + testDbPath +
                 " --data-dir " + testDataDir +
                 " ingest --path " + testDataDir +
                 " --tag ml --tag test"

        output = EXEC_COMMAND(command, timeout=30000)

        // Check for success indicators in output
        successMatch = REGEX_MATCH(output, /Ingested (\d+) documents|Documents: (\d+)/)

        IF successMatch:
            count = PARSE_INT(successMatch[1] OR successMatch[2])
            expectedCount = 3

            IF count == expectedCount:
                RETURN {
                    passed: true,
                    message: "Document ingestion successful",
                    details: "Ingested " + count + " documents"
                }
            ELSE:
                RETURN {
                    passed: false,
                    message: "Ingestion count mismatch",
                    details: "Expected " + expectedCount + ", got " + count
                }
            END IF
        ELSE:
            RETURN {
                passed: false,
                message: "Could not parse ingestion output",
                details: output.substring(0, 200)
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Ingestion failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Test 2: Vector Query
```pseudocode
ASYNC FUNCTION testQuery() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        command = "node dist/cli.js --db " + testDbPath +
                 " --data-dir " + testDataDir +
                 " query 'machine learning' -k 2"

        output = EXEC_COMMAND(command, timeout=30000)

        // Check for result indicators
        hasResults = output.includes("Machine Learning") OR
                    output.includes("score:") OR
                    output.includes("source:")

        IF hasResults:
            resultMatches = REGEX_MATCH_ALL(output, /\d+\./)
            resultCount = resultMatches.length

            RETURN {
                passed: true,
                message: "Query executed successfully",
                details: "Retrieved " + resultCount + " results for 'machine learning'"
            }
        ELSE IF output.includes("No results found"):
            RETURN {
                passed: false,
                message: "Query returned no results (unexpected)",
                details: "Expected to find documents matching 'machine learning'"
            }
        ELSE:
            RETURN {
                passed: false,
                message: "Could not parse query output",
                details: output.substring(0, 200)
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Query failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Test 3: Hybrid Search
```pseudocode
ASYNC FUNCTION testSearch() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        command = "node dist/cli.js --db " + testDbPath +
                 " --data-dir " + testDataDir +
                 " search 'neural networks' -k 2 --format json"

        output = EXEC_COMMAND(command, timeout=30000)

        result = JSON_PARSE(output)

        IF NOT result.results OR NOT IS_ARRAY(result.results):
            RETURN {
                passed: false,
                message: "Search output missing results array",
                details: "Expected JSON with results array"
            }
        END IF

        resultCount = result.results.length
        hasScores = ALL(result.results, r => IS_NUMBER(r.combinedScore))

        IF resultCount > 0 AND hasScores:
            RETURN {
                passed: true,
                message: "Hybrid search executed successfully",
                details: "Retrieved " + resultCount + " results with valid scores"
            }
        ELSE:
            RETURN {
                passed: false,
                message: "Search results incomplete",
                details: "Got " + resultCount + " results, hasScores: " + hasScores
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Search failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Test 4: Graph Query
```pseudocode
ASYNC FUNCTION testGraph() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        command = "node dist/cli.js --db " + testDbPath +
                 " --data-dir " + testDataDir +
                 " graph 'MATCH (n:Document) RETURN n' --format json"

        output = EXEC_COMMAND(command, timeout=30000)

        result = JSON_PARSE(output)

        IF NOT result.nodes OR NOT IS_ARRAY(result.nodes):
            RETURN {
                passed: false,
                message: "Graph query output missing nodes array",
                details: "Expected JSON with nodes array"
            }
        END IF

        nodeCount = result.nodes.length
        edgeCount = result.edges?.length OR 0

        IF nodeCount > 0:
            RETURN {
                passed: true,
                message: "Graph query executed successfully",
                details: "Found " + nodeCount + " nodes, " + edgeCount + " edges"
            }
        ELSE:
            RETURN {
                passed: false,
                message: "Graph query returned no nodes",
                details: "Expected to find document nodes in graph"
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Graph query failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

## Phase 4: Advanced Features

### Test 1: Full Status Report
```pseudocode
ASYNC FUNCTION testStatusFull() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"

        command = "node dist/cli.js --db " + testDbPath +
                 " --data-dir " + testDataDir +
                 " status --full --json"

        output = EXEC_COMMAND(command, timeout=10000)

        status = JSON_PARSE(output)

        IF NOT status.stats:
            RETURN {
                passed: false,
                message: "Full status missing stats",
                details: "Expected stats object in full status output"
            }
        END IF

        vectorCount = status.stats.vector?.totalVectors OR 0
        nodeCount = status.stats.graph?.nodeCount OR 0
        edgeCount = status.stats.graph?.edgeCount OR 0

        hasData = vectorCount > 0 OR nodeCount > 0

        details = "Vectors: " + vectorCount + ", Nodes: " + nodeCount + ", Edges: " + edgeCount

        RETURN {
            passed: hasData,
            message: hasData ? "Full status retrieved successfully" : "Status shows no data",
            details: details
        }
    CATCH error:
        RETURN {
            passed: false,
            message: "Full status check failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

### Test 2: Semantic Router
```pseudocode
ASYNC FUNCTION testRouter() -> CheckResult:
    TRY:
        command = "node dist/cli.js route 'Find all documents about machine learning'"

        output = EXEC_COMMAND(command, timeout=10000)

        hasRoute = output.includes("Route:") AND output.includes("Confidence:")

        IF hasRoute:
            routeMatch = REGEX_MATCH(output, /Route:\s*(\w+)/)
            confidenceMatch = REGEX_MATCH(output, /Confidence:\s*([\d.]+)%/)

            route = routeMatch ? routeMatch[1] : "unknown"
            confidence = confidenceMatch ? confidenceMatch[1] : "unknown"

            RETURN {
                passed: true,
                message: "Semantic router working",
                details: "Routed to: " + route + " (" + confidence + "% confidence)"
            }
        ELSE:
            RETURN {
                passed: false,
                message: "Router output incomplete",
                details: output.substring(0, 200)
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Router test failed",
            details: error.message
        }
    END TRY
END FUNCTION
```

## Phase 5: Cleanup

```pseudocode
ASYNC FUNCTION cleanupTestEnvironment() -> CheckResult:
    TRY:
        testDbPath = "./test-verification.db"
        testDataDir = "./test-verification-data"
        cleanupEnabled = true  // Configurable

        IF cleanupEnabled:
            IF FILE_EXISTS(testDbPath):
                DELETE_FILE(testDbPath)
            END IF

            IF DIRECTORY_EXISTS(testDataDir):
                DELETE_DIRECTORY_RECURSIVE(testDataDir)
            END IF

            RETURN {
                passed: true,
                message: "Test environment cleaned up",
                details: "Removed test database and sample documents"
            }
        ELSE:
            RETURN {
                passed: true,
                message: "Cleanup skipped (cleanup disabled)",
                details: "Test files preserved: " + testDbPath + ", " + testDataDir
            }
        END IF
    CATCH error:
        RETURN {
            passed: false,
            message: "Cleanup failed (non-critical)",
            details: error.message
        }
    END TRY
END FUNCTION
```

## Utility Functions

### Command Execution
```pseudocode
FUNCTION EXEC_COMMAND(command: String, timeout: Integer) -> String:
    TRY:
        process = START_PROCESS(command)
        output = WAIT_FOR_COMPLETION(process, timeout)

        IF process.exitCode != 0:
            THROW ERROR("Command failed with exit code " + process.exitCode)
        END IF

        RETURN output
    CATCH error:
        THROW ERROR("Command execution failed: " + error.message)
    END TRY
END FUNCTION
```

### File Operations
```pseudocode
FUNCTION FILE_EXISTS(path: String) -> Boolean:
    RETURN CHECK_FILE_EXISTS(path)
END FUNCTION

FUNCTION DIRECTORY_EXISTS(path: String) -> Boolean:
    RETURN CHECK_DIRECTORY_EXISTS(path)
END FUNCTION

FUNCTION DELETE_FILE(path: String):
    REMOVE_FILE(path)
END FUNCTION

FUNCTION DELETE_DIRECTORY_RECURSIVE(path: String):
    REMOVE_DIRECTORY_AND_CONTENTS(path)
END FUNCTION

FUNCTION CREATE_DIRECTORY(path: String):
    MAKE_DIRECTORY(path, recursive=true)
END FUNCTION

FUNCTION WRITE_FILE(path: String, content: String):
    WRITE_TEXT_TO_FILE(path, content, encoding="utf8")
END FUNCTION
```

### String Utilities
```pseudocode
FUNCTION REGEX_MATCH(text: String, pattern: RegExp) -> Match | null:
    RETURN text.match(pattern)
END FUNCTION

FUNCTION REGEX_MATCH_ALL(text: String, pattern: RegExp) -> Array<Match>:
    RETURN text.matchAll(pattern).toArray()
END FUNCTION

FUNCTION JSON_PARSE(text: String) -> Object:
    TRY:
        RETURN parseJSON(text)
    CATCH error:
        THROW ERROR("Invalid JSON: " + error.message)
    END TRY
END FUNCTION
```

## Implementation Notes

### Error Handling Strategy
1. **Catch all exceptions** at the check function level
2. **Convert to CheckResult** with passed=false
3. **Include actionable details** in error messages
4. **Never let verification crash** - always return a result

### Timing Strategy
1. **Record start time** at the beginning of each check
2. **Calculate duration** when check completes
3. **Display duration** with check result
4. **Track total time** for summary report

### Output Formatting Strategy
1. **Use color codes** for visual clarity (green=pass, red=fail)
2. **Use icons** (✓/✗) for quick scanning
3. **Show details conditionally** (always on failure, optional on success)
4. **Consistent structure** across all checks

### Test Isolation Strategy
1. **Separate database path** for verification
2. **Separate data directory** for samples
3. **Auto-cleanup** to prevent pollution
4. **No interaction** with user data

## Summary

This implementation plan provides:
- **Complete pseudocode** for all verification phases
- **Data structures** for result tracking
- **Error handling** patterns
- **Utility functions** for common operations
- **Design patterns** for extensibility

The actual TypeScript and Bash implementations follow this plan closely, with language-specific adaptations for file I/O, process execution, and error handling.
