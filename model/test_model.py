import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model
from tensorflow.keras.datasets import mnist

(x_train, y_train), (x_test, y_test) = mnist.load_data()
x_test = x_test / 255.0


model = load_model("digit_model.h5")


index = 5
prediction = model.predict(x_test[index].reshape(1, 28, 28))
digit = np.argmax(prediction)


plt.imshow(x_test[index], cmap="gray")
plt.title(f"Predicted: {digit}, Actual: {y_test[index]}")
plt.axis("off")
plt.show()
