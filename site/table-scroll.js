document.querySelectorAll('.table-scroll[tabindex]').forEach(region=>{
  region.addEventListener('keydown',event=>{
    if(event.target!==region||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    region.scrollBy({left:event.key==='ArrowRight'?120:-120,behavior:'instant'});
  });
});
