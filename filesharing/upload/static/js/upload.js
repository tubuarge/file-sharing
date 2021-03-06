$(function(){

	// Oh IE, how we hate thee.	
	if ($.browser.msie) {
    		$("#chooseDiv").html('<p>Choose your files.</p>');
		$("#chooseDiv").removeClass();
		$("#drop-area").remove();	
  	}
	
	//Create an individual foldername for the files
	var foldername = new Date().getTime();
	foldername += Math.floor(Math.random()*99);

	//The url where the forms are posted
	var uploadURL = foldername+'/';
	
	//Code for the upload form's content
	var newForm = '<div><input type="file" name="file" class="inputfile" /></div>';

	//Keeping track of the upload button
	var uploadPressed = false;
	
	//Model for the file (will be extended with different files)
	var FutuFile = Backbone.Model.extend({
		url: '/foo/',
		
		initialize: function(){
			_.bindAll(this, 'save', 'destroy');

		},
		
		save : function(attrs, options) {
			return this;
		},
		
		destroy : function(options) {
			if (this.collection) this.collection.remove(this);
			this.trigger('remove');			
			return this;
		}
	});

	//A file that will be uploaded through a form
	var RegularFile = FutuFile.extend({
		save : function(attrs, options) {
			this.trigger('save');
			return this;
		},
				
	});

	//A file that will be uploaded using xhr
	var DroppedFile = FutuFile.extend({
		form : null,

		initialize: function(file){
			FutuFile.prototype.initialize.call(this);
			_.bindAll(this, 'save', 'destroy');
			this.form = new FormData();
			this.form.append(file.name, file);
			this.set({'filename' : file.name});
		},

		save : function(attrs, options) {
			var xhr = new XMLHttpRequest();
  			xhr.open('POST', uploadURL, true);
			var that = this;
  			xhr.onload = function(e) {
				that.trigger('xhrDone', this.responseText);
			};
			xhr.send(this.form);
			this.trigger('uploading');
			return this;
		}

	});
	
	//Collection of files
	var FileList = Backbone.Collection.extend({
		model: FutuFile,
	});
	
	//The view for the individual models
	var FileView = Backbone.View.extend({
		tagName: 'form',
		
		events: {
			'click img:first': 'removeFile',
			'change input:file' : 'showName'
		},
		
		initialize: function(){
			_.bindAll(this, 'render', 'removeFile', 'remove', 'showName', 'uploadFile', 'uploading', 'showFilename', 'setCompletedUpload');
			this.el = $(this.el);
			
			//The name for the iframe assisciated with this form
			var iframeName = 'up-iframe-' + (new Date()).getTime();
			
			//Form attributes
			this.el.attr('action', uploadURL);
			this.el.attr('enctype', 'multipart/form-data');
			this.el.attr('method', 'POST');
			this.el.attr('target', iframeName);
			
			//Binding events
			this.model.bind('save', this.uploadFile);
			this.model.bind('remove', this.remove);
			this.model.bind('newfile', this.showName);
			this.model.bind('uploading', this.uploading);
			this.model.bind('xhrDone', this.setCompletedUpload);
			
			//Create the target iframe
			this.targetIframe = $('<iframe name="' + iframeName + '" style="display: none;"></iframe>');
	
			//Add the iframe to the DOM
			$('#iframes').append(this.targetIframe);

			//Add the class to hover the form over the big green button
			if ($.browser.msie == null  || !($.browser.msie)){
				this.el.addClass("emptyForm");	
			}	
		},
		
		render: function(){
			var fileName = this.model.get('filename');
			//Check to see if this is an xhr upload or a traditinal form
			if (fileName != undefined){
				this.showFilename(fileName);
			} else {
				this.el.html(newForm);
			}
		},

		showFilename: function(fileName){
			this.el.removeClass("emptyForm");
			this.el.prepend('<img src="../static/img/x.png" class="file-icon" alt="remove"><span class="filename">'+fileName+' </span>');
		},
		
		removeFile: function(){
			this.model.destroy();
			return false;
		},
		
		//Show the name instead of the file browser
		showName: function(){
			var filePath =  this.el.find('input:file').val();
			var fileName = filePath.replace('C:\\fakepath\\', '');
			
			this.el.find('input:file').hide();
			this.showFilename(fileName);
			
		},

		uploading: function(){
			this.el.find('img').remove();
			this.el.prepend('<img class="file-icon" src="../static/img/loading.gif" alt="loading">')
		},
		
		uploadFile: function(){
			
			this.uploading();
			
			var that = this;
			
			//Set the callback function for the iframe
			this.targetIframe.load(function (){
				
				//Get the status from the iframe
				var status = $(this).contents().text();

				that.setCompletedUpload(status);
	
			});
			
			this.el.submit(); //Submit the form
			
		},

		setCompletedUpload: function(status){
			if (status != ''){
				//Clear old images
				this.el.find('img').remove();
				
				if (status != 'DONE') {			
					//Add warning icon
					this.el.prepend('<img class="file-icon" src="../static/img/alert.png" alt="alert">\
							<span> There was an error with the upload: '+status+'</span>');
					
					this.model.trigger('fileError');
				}
				
				this.model.trigger('fileUploaded');
			}
		}
		
	});
	
	//The view for the collection
	var FileListView = Backbone.View.extend({
		el: $('#forms-wrapper'),
		
		events: {
			'change form input:file' : 'addNewFile',
		},
		
		initialize: function(){
			_.bindAll(this, 'render', 'addOne', 'checkNoForms', 'redirectToZip', 'uploadsDone', 'uploadAll');
			
			this.collection.bind('add', this.addOne);
			this.collection.bind('remove', this.checkNoForms);
			
			//Bind clicking the upload arrrow to the uploading
			var that = this;
			$("#uploadDiv").click(that.uploadAll);
			
			//Add the first form
			this.addNewFile();
			
		},
		
		//Add another form for the file
		addOne: function(file){
			var myFileView = new FileView({
				model: file
			});
			myFileView.render();
			this.el.append(myFileView.el);


			
			//If there is something to upload, enable the upload button
			if (this.collection.length > 1){
				$("#uploadDiv").addClass('arrow');				
			}

			//Enable hover effect for the new form
			$("#chooseDiv").removeClass("hover");
			if ($.browser.msie == null  || !($.browser.msie)){
				$(".inputfile").bind('mouseenter', function(){$("#chooseDiv").addClass("hover");});
				$(".inputfile").bind('mouseleave', function(){$("#chooseDiv").removeClass("hover");});
			}

		},
		
		//Add a new model to the collection
		addNewFile: function(){
			this.collection.add([new RegularFile()]);
		},
		
		//Check that there is always an empty form
		checkNoForms: function(){
			if (this.collection.length == 0 || this.collection.last().get('filename') != undefined) {
				this.addNewFile();	
			}

			if (this.collection.length <= 1){
				$("#uploadDiv").removeClass('arrow');				
			}
		},
		
		//Submit all the forms
		uploadAll: function(){
			//Do not submit if there is only an empty form
			if (this.collection.length < 2) {
				return;
			}
			
			//Disable uploading again and remove the big green button
			if (uploadPressed){
				return;
			} else {
				uploadPressed = true;
				$("#uploadStatus").text("Uploading...");
				$("#uploadDiv").removeClass("arrow");
				
				$("#chooseDiv").removeClass();
				$("#maxSize").remove();
				$("#drop-area").remove();
			}

			//Hide the empty form
			this.el.find('form:last').hide();
			
			var uploadedFiles = 0;
			//This is -1, because we don't want to upload the empty model at the end
			var totalFiles = this.collection.length-1;
			var that = this;
			var errors = 0;
			 
			//Submit the forms individually by saving the models
			this.collection.each(function(file){
				//If this is not the last (empty) model
				if (file != that.collection.last()){
					//Set the callback for a finished upload
					file.bind('fileUploaded', function() {
						uploadedFiles++;
					
						//Check if all the uploads are done
						if (uploadedFiles == totalFiles){
							that.uploadsDone(errors);
						}
					});
				
					//Set the callback for errors in the upload
					file.bind('fileError', function(){
						errors++;
					});
				
					 file.save();  //Save the model
				}
			 });
		},
		
		//When all the uploads are done
		uploadsDone: function(errors){
			var that = this;
			
			//If there are errors
			if (errors > 0) {
				//If there was more than one file (don't forget the empty form)
				if (this.collection.length > 2 ){
					var errText = $('<div><p>There was an error with one or more files.<br>'
								+'Do you want to zip the rest of the files anyway?</p>'
								+'<button class="yes">Yes</button><button class="no">No</button></div>');
				
					errText.find("button.yes").click(function(){
						that.redirectToZip(); //Redirect to zipping the files anyway
					});
				
					errText.find("button.no").click(function(){
						window.location = '/'; //Redirect to the home page
					}); 
						
				} else {
					//Only one file was uploaded and it was too big
					var errText = $('<div><p>The file was too big.</p><button>Return</button></div>');
					errText.find("button").click(function(){
						window.location = '/'; 
					});
				}
				
				//Add the error text to the DOM
				$("#status").append(errText);
				
			} else {
				//No errors, continue to the zipping
				that.redirectToZip();
			}
		},
		
		//Redirect the user to the zipping
		redirectToZip: function(){
			
			//Show status
			$("#uploadStatus").text("Zipping...");

			//Move to the next stage
			$.post('/zip/'+foldername+'/', function(data) {
				$('#sendPassDiv').html(data);
				$('#send-form-wrapper').show();
				$('#status').html('');
				$("#uploadStatus").text("Ready.");
			});
		}
		
	});
	
	
	//Create the file list and view
	var myFileList = new FileList();
	
	var myListView = new FileListView({
		collection: myFileList
	});

	//Function for handling the drop event
	function handleDrop(evt){
		evt.stopPropagation();
  		evt.preventDefault();

		//Do not add files if we have already pressed upload
		if (uploadPressed){
			return;
		}

		$('#status').prepend('<img class="file-icon" src="../static/img/loading.gif" alt="Loading...">');

		//The files that were dropped
		var files = evt.dataTransfer.files;

		if (files.length > 0){

			//Iterate over the array of files
			for (var i = 0, fi; fi = files[i]; i++) {
	
				//Check the filesize locally
				if (fi.size < 367001600){
					//Add a new DroppedFile
     					myFileList.add(new DroppedFile(fi));
	
					//Remove the empty form that was the last model before we added this new file
					//A new, empty, form will be added to the end automatically
					var secondToLast = myFileList.length-2;
					myFileList.at(secondToLast).destroy();
				} else {
					$('#status').prepend('<p>The file '+fi.name+' was too large.</p>');
				}
                	}
		}
		$('#status img').remove();

	}


	//Lets save the text in the drop box	
	var dropText = $('#drop-area span').text();

	//Function for preventing the default action of drag 'n drop
	function prevent(evt){
		evt.stopPropagation();
    		evt.preventDefault();	
	}


	function addHilight(evt){
		evt.stopPropagation();
    		evt.preventDefault();

		$('#drop-area span').text('Release mouse to drop files.');
		$('#drop-area span').fadeOut(3000, function(){
			$('#drop-area span').text(dropText);
			$('#drop-area span').show();
		});

	}

	function removeHilight(evt){
		evt.stopPropagation();
    		evt.preventDefault();
	}

	//Select the drop area and add some listeners for the events
	var dragnDrop = document.getElementById('drop-area');
	var dragnDropText = document.getElementById('drop-text');
	dragnDrop.addEventListener('dragenter', addHilight, false);
	dragnDrop.addEventListener('dragleave', removeHilight, false);
	dragnDrop.addEventListener('dragover', prevent, false);
	dragnDrop.addEventListener('drop', handleDrop, false);
	dragnDropText.addEventListener('dragenter', prevent, false);
	dragnDropText.addEventListener('dragleave', prevent, false);
	dragnDropText.addEventListener('dragover', prevent, false);
	dragnDropText.addEventListener('drop', handleDrop, false);

	


});