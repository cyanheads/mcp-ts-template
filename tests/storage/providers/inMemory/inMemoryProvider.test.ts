/**
 * @fileoverview Integration tests for the InMemoryProvider.
 * This test suite validates that the InMemoryProvider correctly implements the
 * IStorageProvider interface by running the generic compliance tests against it.
 * @module tests/storage/providers/inMemory/inMemoryProvider.test
 */
import { InMemoryProvider } from '../../../../src/storage/providers/inMemory/inMemoryProvider.js';
import { storageProviderTests } from '../../storageProviderCompliance.test.js';

// Run the compliance tests for InMemoryProvider
storageProviderTests(() => new InMemoryProvider(), 'InMemoryProvider');
