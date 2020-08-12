function showLoader(){
    document.getElementsByClassName('loader-container')[0].style.display = 'flex';
    document.getElementsByClassName('app')[0].style.display = 'none';
}
function hideLoader(){
    document.getElementsByClassName('loader-container')[0].style.display = 'none';
    document.getElementsByClassName('app')[0].style.display = 'block';
}