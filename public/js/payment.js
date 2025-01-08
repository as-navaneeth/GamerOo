async function handlePayment(orderId, amount, paymentMethod) {
    try {
        if (paymentMethod === 'COD') {
            const response = await fetch('/payment/cod/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderId })
            });
            
            const result = await response.json();
            if (result.success) {
                window.location.href = `/orders/${orderId}`;
            } else {
                alert('Error processing COD order');
            }
        } else if (paymentMethod === 'RAZORPAY') {
            // Create Razorpay order
            const orderResponse = await fetch('/payment/razorpay/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount, orderId })
            });
            
            const orderData = await orderResponse.json();
            if (!orderData.success) {
                throw new Error('Error creating Razorpay order');
            }

            // Initialize Razorpay
            const options = {
                key: orderData.key_id,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'GamerOo',
                description: 'Gaming Product Purchase',
                order_id: orderData.order.id,
                handler: async function (response) {
                    try {
                        const verifyResponse = await fetch('/payment/razorpay/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                orderId,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyResult = await verifyResponse.json();
                        if (verifyResult.success) {
                            window.location.href = `/orders/${orderId}`;
                        } else {
                            alert('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        alert('Payment verification failed');
                    }
                },
                prefill: {
                    name: document.getElementById('userName')?.value || '',
                    email: document.getElementById('userEmail')?.value || '',
                    contact: document.getElementById('userPhone')?.value || ''
                },
                theme: {
                    color: '#3399cc'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Error processing payment');
    }
}
