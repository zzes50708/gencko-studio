setTimeout(function() {
    var l = document.getElementById('loader');
    if(l) { 
        l.classList.remove('active'); 
        l.style.opacity = '0'; 
        l.style.pointerEvents = 'none'; 
        setTimeout(function(){ l.style.display='none'; }, 500); 
    }
}, 2500);