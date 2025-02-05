export const retry = async (fn, retries = 3, delayMs = 1000) => {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (i === retries - 1) throw error;
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}
};

export const retryWithDelay = retry; // Export retryWithDelay as an alias for retry