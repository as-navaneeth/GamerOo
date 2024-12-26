document.addEventListener('DOMContentLoaded', function() {
    const editBtn = document.querySelector('.edit-btn');
    const submitBtn = document.querySelector('.submit-btn');
    const inputs = document.querySelectorAll('.info-box input:not([type="password"])');
    
    // Initially hide submit button
    submitBtn.style.display = 'none';

    editBtn.addEventListener('click', function() {
        const isEditing = editBtn.textContent === 'Cancel';
        
        if (isEditing) {
            // Cancel editing
            editBtn.textContent = 'Edit';
            submitBtn.style.display = 'none';
            inputs.forEach(input => {
                input.readOnly = true;
                input.value = input.dataset.originalValue;
            });
        } else {
            // Enable editing
            editBtn.textContent = 'Cancel';
            submitBtn.style.display = 'block';
            inputs.forEach(input => {
                input.readOnly = false;
                input.dataset.originalValue = input.value;
            });
        }
    });

    // Handle form submission
    document.querySelector('.info-box').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('mobile').value,
            email: document.getElementById('email').value
        };

        try {
            const response = await fetch('/userProfile/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.success) {
                // Reset UI to view mode
                editBtn.textContent = 'Edit';
                submitBtn.style.display = 'none';
                inputs.forEach(input => {
                    input.readOnly = true;
                });
                Swal.fire({
                    icon:'success',
                    title:"Success!",
                    text:"Profile updated Successfully",
                    confirmButtonColor:'#3085d6',
                    confirmButtonText: 'OK'
                })
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: data.message || 'Failed to update profile',
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Try Again'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating profile');
        }
    });
});


