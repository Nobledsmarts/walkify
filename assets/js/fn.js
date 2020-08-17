function showLoader(){
    document.getElementsByClassName('loader-container')[0].style.display = 'flex';
    document.getElementsByClassName('app')[0].style.display = 'none';
}
function hideLoader(){
    document.getElementsByClassName('loader-container')[0].style.display = 'none';
    document.getElementsByClassName('app')[0].style.display = 'block';
}

function formartComment (str, htmlclass){
    let addComment = (str) => {
        // console.log(JSON.stringify(str, 2));
        return '<span class="' + htmlclass + '">' + str + '</span>';
   }
    str = str.replace(/\/\/(.+?)+/ig, addComment);
    str = str.replace(/(\/\*)(.+?)\*\//igs, addComment);
    return str;
}
///* 
// mm 
// */