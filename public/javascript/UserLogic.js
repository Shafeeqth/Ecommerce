



// function productStock(this, sizeVariant) {

//     let quantityMessage = document.getElementById('quantity_message');
//     let addToCart = document.getElementById('add-to-cart');
//     let outOfStock = document.getElementById('out-of-stock');
//     console.log(this.value);
//     return

//     if(product.totalStock && product.totalStock <= 10) {
//         `Hurry! Only <span class="items"><%= product.totalStock %></span> left in stock.`



//     }
//     if(product.totalStock <= 0){
//         `<span   class="text-white fw-bold">Out of Stock</span>`

//     }
    
//    `<button style="all: unset;" onclick="addToCart('<%=product.product._id%>')"><a class="btn-product btn-cart">add to cart</a></button>`





// } 

function addToCartFromWishlist(id) {
    let size = document.getElementById('sizeVariant').selectedOptions[0].value
    console.log(size)
    let data = JSON.stringify({
        data:{
            id,
            addToCartFromWishlist:true,
            size
        }})

    $.ajax({
        url: '/api/v1/add-cart',
        type: 'POST',
        contentType: 'application/json',
        data: data ,
        success: (response) => {
            if (response.addToCartFromWishlist == true) {
               
                Swal.fire({
                    titleText: 'Produce moved to Cart',
                    width: '400px',
                    padding: '10px',
                    icon: 'success',
                    toast: true,

                    showConfirmButton: false,
                    timer: 1500,
                });
                setTimeout(() => {
                    const removeAudio = document.getElementById('remove-audio')
                if (removeAudio) removeAudio.play();
                    
                }, 700);
                
                setTimeout(() => {
                    $('#header-right').load('/api/v1/wishlist #header-right');
                   
                    $('#Reload').load('/api/v1/wishlist #Reload', null, () => {
                        

                    })
                    
                }, 1000);
                
            }else if(response.error == true) {
                Swal.fire({
                    titleText: response.message,
                    icon: 'info',
                    width: '300px',
                    
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
    
                });
                

            }

        }
    })


}

function addToCart(id) {
    console.log(id)
    let size = document.getElementById(`size${id}`).selectedOptions[0].value;
    console.log(size)
    $.ajax({
        url: '/api/v1/add-cart',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ data:{id, size }}),
        success: (response) => {
            console.log(response)
            if (response.userNotFound == true) {
                Swal.fire({
                    html: "<b>You is not Logged in</b>",
                    iconHtml: 'K',
                    iconColor: '#30a702',
                    background: '#f9f6e8',
                    width: '280px',
                    padding: '10px',
                    icon: 'success',
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                });

            } else if (response.productAlreadyExist == true) {
                Swal.fire({
                    titleText: 'Product already exist in cart',
                    width: '300px',
                   
                    icon: 'info',
                    toast: true,

                    showConfirmButton: false,
                    timer: 1500,
                });


            } else if (response.addedToCart == true) {
                $('#header-right').load('/api/v1/shop #header-right', null, () => {
                    Swal.fire({
                        titleText: 'Produce added to cart successfully',
                        width: '300px',
                       
                        icon: 'success',
                        toast: true,

                        showConfirmButton: false,
                        timer: 1500,
                    });

                })



            }else if(response.error == true)
            Swal.fire({
                titleText: response.message,
                icon: 'info',
                width: '300px',
               
                toast: true,
                showConfirmButton: false,
                timer: 1500,

            });





        }
    })


}





function addToWishlist(id) {

    axios.post('/api/v1/add-wishlist', { id: id })
        // .then((response) =>response.json())
        .then(response => {
            if (response.data.userNotFound) {

                Swal.fire({
                    html: "<b>You is not Logged in</b>",
                    iconHtml: 'K',
                    iconColor: '#30a702',
                    background: '#f9f6e8',
                    width: '280px',
                    padding: '10px',
                    icon: 'success',
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,

                });


            } else if (response.data.addedToWishlist) {
                $('#header-right').load('/api/v1/shop #header-right');
                Swal.fire({
                    titleText: "Product added to wishlist",
                    icon: 'success',
                    //    width:'300px',
                    //    height:'300px',
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,

                });

            } else if (response.data.productAlreadyExist== true) {
                Swal.fire({
                    titleText: "Product already exist in wishlist",
                    icon: 'info',
                    width: '300px',
                  
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,

                });

            }else if (response.data.error== true) {
                Swal.fire({
                    title: 'Error!',
                    text: data.message,
                    icon: 'error',
                    width: '300px',
                  
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,

                });

            }
        })
        .catch(error => console.log(error))
}



// Remove from cart

function removeFromCart(id, size, total ) {
    let data = { id ,size, total}
    console.log(data)
    Swal.fire({
        title: 'Are you sure',
        text: `Do you want to remove`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes!',
    }).then((decision) => {
        if (decision.isConfirmed) {
            $.ajax({
                method: 'delete',
                url: '/api/v1/remove-cart',
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: (response) => {
                    // window.location.reload(true)
                    if (response.success === true) {
                        $('#header-right').load('/api/v1/cart #header-right');
                        $('#Reload').load('/api/v1/cart #Reload', null, () => {

                            Swal.fire({
                                titleText: 'Successfully removed from cart',
                                // width:'300px',
                                // height:'300px',
                                icon: 'success',
                                toast: true,

                                showConfirmButton: false,
                                timer: 1500,

                            });
                        });
                    }
                }
            });
        }
    });


}
function changeCount(event, cartId, productId, size, price) {



    let count = event.target.value;
    console.log(count);


    let data = { count, cartId , productId, size, price};
    console.log(data);
    $.ajax({
        method: 'put',
        url: '/api/v1/update-cart',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: (response) => {
            console.log(response)
            if (response.error == true) {
                Swal.fire({
                    titleText: response.message,
                    width: '300px',

                    icon: 'error',
                    toast: true,

                    showConfirmButton: false,
                    timer: 1500,
                });

            
            }
            $('#header-right').load('/api/v1/cart #header-right');
            
                $('#Reload').load('/api/v1/cart #Reload', null,)
          
        }
    })






}
function deleteAddress(id) {
    let data = { id }
    Swal.fire({
        title: 'Are you sure',
        text: `Do you want to Delete `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes!',
    }).then((decision) => {
        if (decision.isConfirmed) {
            $.ajax({
                method: 'delete',
                url: '/api/v1/delete-address',
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: (response) => {

                    if (response.success === true) {



                        Swal.fire({
                            titleText: 'Successfully addrees deleted',
                          
                            icon: 'success',
                            toast: true,

                            showConfirmButton: false,
                            timer: 1500,

                        });
                        location.reload()
                        ;
                    }
                }
            });
        }
    });


}











function changePassword() {
    let currentPassword = document.getElementById('password');
    let newPassword = document.getElementById('new-password');
    let confirmtPassword = document.getElementById('confirm-password');

    let curPassword = currentPassword.value;
    let nPassword = newPassword.value;
    let conPassword = confirmtPassword.value;

    let newError = document.getElementById('newError');
    let confirmError =  document.getElementById('confirmError');

    

    fetch('/api/v1/profile/change-password', {
        method: "put",
        body: JSON.stringify({ curPassword, nPassword, conPassword }),
        headers: {
            'Content-Type': 'application/json',
        }

    }).then((response) => response.json())
        .then((response) => {
            console.log(response)
            if (response.currentError) {
                currentPassword.style.border = '1px red solid'
                let div = document.getElementById('currentError')
                div.innerText = response.error
                setTimeout(() => {
                    currentPassword.style.border = ''
                    div.innerText = ''

                }, 3000);
            } else if (response.success) {
                window.location.reload(true)
            } else if (response.validateError) {
                newPassword.style.border = '1px red solid'
                confirmtPassword.style.border = '1px red solid'
                let div = document.getElementById('currentError')
                div.innerText = response.error
                setTimeout(() => {
                    newPassword.style.border = ''
                    confirmtPassword.style.border = ''
                    div.innerText = ''

                }, 6000);

            }

        })

        .catch((error) => console.log(error))

}

function show() {
    let x = document.getElementById("password");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}


function changeUserDetails() {
    let userName = document.getElementById('nameField');
    
    let errorDiv = document.getElementById('error-div');








    let name = userName.value;
    

    fetch('/api/v1/profile/change-user-details', {
        method: "put",
        body: JSON.stringify({ name }),
        headers: {
            'Content-Type': 'application/json',
        }

    }).then((response) => response.json())
        .then((response) => {
            console.log(response)

            if (response.validateError) {
                console.log(response.error)
                userName.style.border = '1px red solid';
             
                errorDiv.style.display = 'block'
                errorDiv.innerText = response.error;

                setTimeout(() => {
                    userName.style.border = ''
                   
                    errorDiv.style.display = 'none'
                    errorDiv.innerText = ''

                }, 4500)

            } else if (response.success) {
                window.location.reload(true);
            }
        })
}



