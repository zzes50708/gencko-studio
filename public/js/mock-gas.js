// Mock google.script.run for local development
if (typeof google === 'undefined') {
    console.warn('⚠️ Google Apps Script environment not found. Using Mock.');
    window.google = {
        script: {
            run: {
                withSuccessHandler: function(onSuccess) {
                    return {
                        withFailureHandler: function(onFailure) {
                            return {
                                getInventory: () => { console.log('Mock: getInventory'); onSuccess(JSON.stringify({status:'success', data:[]})); },
                                getAnnouncement: () => { console.log('Mock: getAnnouncement'); onSuccess(JSON.stringify({status:'success', list:[]})); },
                                getArticles: () => { console.log('Mock: getArticles'); onSuccess(JSON.stringify({status:'success', data:[]})); },
                                logSearch: (kw) => console.log('Mock: logSearch', kw),
                                checkBlacklist: () => onSuccess(JSON.stringify({isBlacklisted: false}))
                            };
                        }
                    };
                }
            }
        }
    };
}